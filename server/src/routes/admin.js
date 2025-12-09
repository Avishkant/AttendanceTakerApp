const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

const router = express.Router();

// Middleware: admin only
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
});

// GET /api/admin/employees
router.get('/employees', async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};

    // If search query exists, search by name or email
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i'); // case-insensitive search
      query = {
        $or: [{ name: searchRegex }, { email: searchRegex }],
      };
    }

    const list = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/employees/:id/attendance
router.get('/employees/:id/attendance', async (req, res) => {
  try {
    const id = req.params.id;
    // parse dates safely
    const safeDate = (s, fallback) => {
      if (!s) return fallback;
      const d = new Date(s);
      return isNaN(d.getTime()) ? fallback : d;
    };
    const from = safeDate(req.query.from, new Date(0));
    const to = safeDate(req.query.to, new Date());
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const groupBy = req.query.groupBy || null; // 'day' | 'week' | 'month' or null
    console.log(
      `[admin] attendance for user=${id} from=${from.toISOString()} to=${to.toISOString()} groupBy=${groupBy} page=${page} limit=${limit}`,
    );
    const Attendance = require('../models/Attendance');

    if (groupBy && ['day', 'week', 'month'].includes(groupBy)) {
      // build period format expression
      let periodExpr;
      if (groupBy === 'day') {
        periodExpr = {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        };
      } else if (groupBy === 'month') {
        periodExpr = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      } else if (groupBy === 'week') {
        periodExpr = {
          $concat: [
            { $toString: { $isoWeekYear: '$timestamp' } },
            '-W',
            { $toString: { $isoWeek: '$timestamp' } },
          ],
        };
      }

      const agg = await Attendance.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(id),
            timestamp: { $gte: from, $lte: to },
          },
        },
        { $project: { type: 1, timestamp: 1 } },
        { $addFields: { period: periodExpr } },
        {
          $group: {
            _id: { period: '$period', type: '$type' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.period': -1 } },
      ]);

      // reshape to [{ period, in, out }]
      const map = {};
      agg.forEach(a => {
        const period = a._id.period;
        const type = a._id.type;
        map[period] = map[period] || { period, in: 0, out: 0 };
        if (type === 'in') map[period].in = a.count;
        else if (type === 'out') map[period].out = a.count;
      });
      const result = Object.values(map).sort((x, y) =>
        x.period > y.period ? -1 : 1,
      );
      console.log(`[admin] aggregation result count=${result.length}`);
      console.log(`[admin] aggregation sample=`, result.slice(0, 5));
      if (result.length === 0) {
        // include some diagnostics so client can show helpful info
        const match = { user: new mongoose.Types.ObjectId(id) };
        const total = await Attendance.countDocuments(match);
        const minDoc = await Attendance.findOne(match)
          .sort({ timestamp: 1 })
          .limit(1);
        const maxDoc = await Attendance.findOne(match)
          .sort({ timestamp: -1 })
          .limit(1);
        return res.json({
          success: true,
          data: result,
          meta: {
            total,
            minTimestamp: minDoc?.timestamp || null,
            maxTimestamp: maxDoc?.timestamp || null,
          },
        });
      }
      return res.json({ success: true, data: result });
    }

    // default: return raw records with pagination (to avoid large payloads)
    const skip = (page - 1) * limit;
    const records = await Attendance.find({
      user: new mongoose.Types.ObjectId(id),
      timestamp: { $gte: from, $lte: to },
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    console.log(`[admin] raw records count=${records.length}`);
    if (records.length > 0)
      console.log(
        `[admin] raw sample timestamps=`,
        records.slice(0, 3).map(r => r.timestamp.toISOString()),
      );
    if (records.length === 0) {
      const match = { user: new mongoose.Types.ObjectId(id) };
      const total = await Attendance.countDocuments(match);
      const minDoc = await Attendance.findOne(match)
        .sort({ timestamp: 1 })
        .limit(1);
      const maxDoc = await Attendance.findOne(match)
        .sort({ timestamp: -1 })
        .limit(1);
      return res.json({
        success: true,
        data: records,
        meta: {
          total,
          minTimestamp: minDoc?.timestamp || null,
          maxTimestamp: maxDoc?.timestamp || null,
        },
      });
    }
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Diagnostic endpoint for admin: returns min/max timestamps and a small sample for a user
router.get('/employees/:id/attendance/diagnose', async (req, res) => {
  try {
    const id = req.params.id;
    const Attendance = require('../models/Attendance');
    const match = { user: new mongoose.Types.ObjectId(id) };
    const total = await Attendance.countDocuments(match);
    const sampleLatest = await Attendance.find(match)
      .sort({ timestamp: -1 })
      .limit(10);
    const minDoc = await Attendance.findOne(match)
      .sort({ timestamp: 1 })
      .limit(1);
    const maxDoc = await Attendance.findOne(match)
      .sort({ timestamp: -1 })
      .limit(1);
    return res.json({
      success: true,
      data: {
        total,
        minTimestamp: minDoc ? minDoc.timestamp : null,
        maxTimestamp: maxDoc ? maxDoc.timestamp : null,
        sampleLatest,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/employees/:id/requests
router.get('/employees/:id/requests', async (req, res) => {
  try {
    const id = req.params.id;
    const list = await require('../models/DeviceChangeRequest')
      .find({ user: id })
      .sort({ requestedAt: -1 });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/settings/company-ips
router.get('/settings/company-ips', async (req, res) => {
  try {
    const Setting = require('../models/Setting');
    const doc = await Setting.findOne({ key: 'company_allowed_ips' });
    const ips = Array.isArray(doc?.value) ? doc.value : doc?.value || [];
    return res.json({ success: true, data: ips });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/settings/company-ips
router.put('/settings/company-ips', async (req, res) => {
  try {
    const { ips } = req.body;
    if (!ips || !Array.isArray(ips))
      return res
        .status(422)
        .json({ success: false, message: 'ips must be an array' });
    const Setting = require('../models/Setting');
    let doc = await Setting.findOne({ key: 'company_allowed_ips' });
    if (!doc) {
      doc = await Setting.create({ key: 'company_allowed_ips', value: ips });
    } else {
      doc.value = ips;
      await doc.save();
    }
    return res.json({ success: true, data: doc.value });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/employees/:id/allowed-ips
router.patch('/employees/:id/allowed-ips', async (req, res) => {
  try {
    const id = req.params.id;
    const { allowedIPs } = req.body;
    if (!Array.isArray(allowedIPs))
      return res
        .status(422)
        .json({ success: false, message: 'allowedIPs must be an array' });
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    user.allowedIPs = allowedIPs;
    await user.save();
    return res.json({
      success: true,
      data: { id: user._id, allowedIPs: user.allowedIPs },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/employees  (create)
router.post('/employees', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res
        .status(422)
        .json({ success: false, message: 'Missing fields' });
    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: 'Email already in use' });
    // hash password here
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      name,
      email,
      passwordHash: hash,
      role: role || 'employee',
    });
    // Return complete user data (excluding passwordHash)
    const userData = user.toObject();
    delete userData.passwordHash;
    return res.json({
      success: true,
      data: userData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/employees/:id  (update name/role)
router.patch('/employees/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, role } = req.body;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    if (name) user.name = name;
    if (role) user.role = role;
    await user.save();
    return res.json({
      success: true,
      data: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/employees/:id  (delete)
router.delete('/employees/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    await User.deleteOne({ _id: id });
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/employees/:id/reset-password
router.post('/employees/:id/reset-password', async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;
    if (!password)
      return res
        .status(422)
        .json({ success: false, message: 'Password required' });
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    await user.save();
    return res.json({ success: true, message: 'Password reset' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/employees/:id/deregister-device
router.post('/employees/:id/deregister-device', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    user.registeredDevice = null;
    await user.save();
    return res.json({ success: true, message: 'Device deregistered' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/employees/:id/attendance/export
router.get('/employees/:id/attendance/export', async (req, res) => {
  try {
    const id = req.params.id;
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const Attendance = require('../models/Attendance');
    const records = await Attendance.find({
      user: id,
      timestamp: { $gte: from, $lte: to },
    }).populate('user', 'name email');
    const createCsvStringifier =
      require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'user', title: 'User' },
        { id: 'email', title: 'Email' },
        { id: 'type', title: 'Type' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'ip', title: 'IP' },
        { id: 'deviceId', title: 'DeviceId' },
      ],
    });
    const recordsForCsv = records.map(r => ({
      user: r.user?.name || '',
      email: r.user?.email || '',
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      ip: r.ip || '',
      deviceId: r.deviceId || '',
    }));
    const header = csvStringifier.getHeaderString();
    const csv = header + csvStringifier.stringifyRecords(recordsForCsv);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_user_${id}_${Date.now()}.csv"`,
    );
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/employees/:id/attendance
// Admin can create an attendance record for a user (used when user forgot to mark)
router.post('/employees/:id/attendance', async (req, res) => {
  try {
    const id = req.params.id;
    const { type, timestamp, note } = req.body;
    if (!type || !['in', 'out'].includes(type))
      return res.status(422).json({ success: false, message: 'Invalid type' });

    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    let ts = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(ts.getTime())) ts = new Date();

    const Attendance = require('../models/Attendance');
    const rec = await Attendance.create({
      user: user._id,
      type,
      timestamp: ts,
      ip: req.ip || null,
      deviceId: req.headers['x-device-id'] || null,
      note: note || 'Marked by admin',
      status: 'recorded',
    });

    return res.json({ success: true, data: rec });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/reports?from=&to=
router.get('/reports', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const groupBy = req.query.groupBy || null; // day|week|month or null

    if (groupBy && ['day', 'week', 'month'].includes(groupBy)) {
      let periodExpr;
      if (groupBy === 'day')
        periodExpr = {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        };
      else if (groupBy === 'month')
        periodExpr = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      else if (groupBy === 'week')
        periodExpr = {
          $concat: [
            { $toString: { $isoWeekYear: '$timestamp' } },
            '-W',
            { $toString: { $isoWeek: '$timestamp' } },
          ],
        };

      const agg = await Attendance.aggregate([
        { $match: { timestamp: { $gte: from, $lte: to } } },
        { $project: { user: 1, type: 1, timestamp: 1 } },
        { $addFields: { period: periodExpr } },
        {
          $group: {
            _id: { user: '$user', period: '$period', type: '$type' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.period': -1 } },
      ]);

      // reshape to: { user, period, in, out }
      const map = {};
      const mongoose = require('mongoose');
      for (const a of agg) {
        const userId = a._id.user.toString();
        const period = a._id.period;
        const key = `${userId}::${period}`;
        map[key] = map[key] || { user: userId, period, in: 0, out: 0 };
        if (a._id.type === 'in') map[key].in = a.count;
        else if (a._id.type === 'out') map[key].out = a.count;
      }
      const result = Object.values(map);
      // populate user info
      const userIds = Array.from(new Set(result.map(r => r.user)));
      const users = await User.find({ _id: { $in: userIds } }).select(
        'name email',
      );
      const usersById = Object.fromEntries(
        users.map(u => [u._id.toString(), u]),
      );
      const final = result.map(r => ({
        ...r,
        userInfo: usersById[r.user] || null,
      }));
      return res.json({ success: true, data: final });
    }

    // default old behavior: counts per user/type
    const agg = await Attendance.aggregate([
      { $match: { timestamp: { $gte: from, $lte: to } } },
      { $group: { _id: { user: '$user', type: '$type' }, count: { $sum: 1 } } },
    ]);
    return res.json({ success: true, data: agg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/reports/export?from=&to=
router.get('/reports/export', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const records = await Attendance.find({
      timestamp: { $gte: from, $lte: to },
    }).populate('user', 'name email');

    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'user', title: 'User' },
        { id: 'email', title: 'Email' },
        { id: 'type', title: 'Type' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'ip', title: 'IP' },
        { id: 'deviceId', title: 'DeviceId' },
      ],
    });

    const recordsForCsv = records.map(r => ({
      user: r.user?.name || '',
      email: r.user?.email || '',
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      ip: r.ip || '',
      deviceId: r.deviceId || '',
    }));
    const header = csvStringifier.getHeaderString();
    const csv = header + csvStringifier.stringifyRecords(recordsForCsv);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_${Date.now()}.csv"`,
    );
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
