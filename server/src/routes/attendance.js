const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");
const { verifyDeviceAndIp } = require("../middleware/ipDeviceCheck");

const router = express.Router();

// POST /api/attendance/mark
router.post("/mark", auth, verifyDeviceAndIp, async (req, res) => {
  try {
    const user = req.user;
    const type = req.body.type === "out" ? "out" : "in";
    // Prevent consecutive identical marks (e.g., IN -> IN) to enforce IN before OUT
    const last = await Attendance.findOne({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(1);
    if (last && last.type === type) {
      return res.status(422).json({
        success: false,
        message:
          type === "in"
            ? "You have already marked IN. Please mark OUT before marking IN again."
            : "You have already marked OUT. Please mark IN before marking OUT again.",
      });
    }

    const attendance = await Attendance.create({
      user: user._id,
      type,
      ip: req.clientIp,
      deviceId: req.clientDeviceId,
    });
    return res.json({ success: true, data: attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/history
router.get("/history", auth, async (req, res) => {
  try {
    const user = req.user;
    // parse dates safely; if invalid, fallback to sensible defaults
    const safeDate = (s, fallback) => {
      if (!s) return fallback;
      const d = new Date(s);
      return isNaN(d.getTime()) ? fallback : d;
    };
    const from = safeDate(req.query.from, new Date(0));
    const to = safeDate(req.query.to, new Date());
    // pagination support to avoid huge payloads
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const records = await Attendance.find({
      user: user._id,
      timestamp: { $gte: from, $lte: to },
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/break/start
router.post("/break/start", auth, verifyDeviceAndIp, async (req, res) => {
  try {
    const user = req.user;
    // Find the most recent check-in
    const lastCheckIn = await Attendance.findOne({
      user: user._id,
      type: "in",
    }).sort({ timestamp: -1 });

    if (!lastCheckIn) {
      return res.status(422).json({
        success: false,
        message: "You must be checked in to start a break.",
      });
    }

    // Check if there's a checkout after this check-in
    const checkOutAfter = await Attendance.findOne({
      user: user._id,
      type: "out",
      timestamp: { $gt: lastCheckIn.timestamp },
    });

    if (checkOutAfter) {
      return res.status(422).json({
        success: false,
        message: "You must be checked in to start a break.",
      });
    }

    // Check if already on break
    if (lastCheckIn.onBreak) {
      return res.status(422).json({
        success: false,
        message: "You are already on a break.",
      });
    }

    // Start break
    lastCheckIn.breaks.push({ start: new Date() });
    lastCheckIn.onBreak = true;
    await lastCheckIn.save();

    return res.json({ success: true, data: lastCheckIn });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/break/end
router.post("/break/end", auth, verifyDeviceAndIp, async (req, res) => {
  try {
    const user = req.user;
    // Find the most recent check-in with an active break
    const lastCheckIn = await Attendance.findOne({
      user: user._id,
      type: "in",
      onBreak: true,
    }).sort({ timestamp: -1 });

    if (!lastCheckIn) {
      return res.status(422).json({
        success: false,
        message: "You are not currently on a break.",
      });
    }

    // Find the last break without an end time
    const lastBreak = lastCheckIn.breaks[lastCheckIn.breaks.length - 1];
    if (!lastBreak || lastBreak.end) {
      return res.status(422).json({
        success: false,
        message: "No active break found.",
      });
    }

    // End break
    lastBreak.end = new Date();
    lastCheckIn.onBreak = false;
    await lastCheckIn.save();

    return res.json({ success: true, data: lastCheckIn });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
