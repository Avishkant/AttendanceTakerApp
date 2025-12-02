const express = require("express");
const auth = require("../middleware/auth");
const DeviceChangeRequest = require("../models/DeviceChangeRequest");
const User = require("../models/User");

const router = express.Router();

// POST /api/devices/request-change  (employee)
router.post("/request-change", auth, async (req, res) => {
  try {
    const user = req.user;
    const newDeviceId = req.body.deviceId || req.headers["x-device-id"];
    if (!newDeviceId)
      return res
        .status(422)
        .json({ success: false, message: "Device id required" });
    // If the requester is an admin, auto-approve and set their registeredDevice immediately
    if (user.role === "admin") {
      user.registeredDevice = {
        id: newDeviceId,
        name: req.body.name || "admin device",
        registeredAt: new Date(),
      };
      await user.save();
      return res.json({
        success: true,
        data: {
          message: "Admin device registered",
          registeredDevice: user.registeredDevice,
        },
      });
    }

    // Prevent duplicate pending requests: user can only have one pending request at a time
    const existingPending = await DeviceChangeRequest.findOne({
      user: user._id,
      status: "pending",
    });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending device-change request. Please wait for admin review.",
        requestId: existingPending._id,
      });
    }

    const doc = await DeviceChangeRequest.create({
      user: user._id,
      newDeviceId,
      newDeviceInfo: { ua: req.headers["user-agent"], note: req.body.note },
    });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/devices/my-requests (employee) - list own requests
router.get("/my-requests", auth, async (req, res) => {
  try {
    const user = req.user;
    // Return the full list of requests for the authenticated user (so they can see approved/rejected statuses)
    const list = await DeviceChangeRequest.find({ user: user._id })
      .sort({ requestedAt: -1 })
      .lean();
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/devices/requests (admin) - list pending
router.get("/requests", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    const list = await DeviceChangeRequest.find()
      .populate("user", "name email")
      .sort({ requestedAt: -1 });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/requests/:id/approve  (admin)
router.post("/requests/:id/approve", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    const id = req.params.id;
    const reqDoc = await DeviceChangeRequest.findById(id);
    if (!reqDoc)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res
        .status(422)
        .json({ success: false, message: "Request already reviewed" });
    // update user
    const user = await User.findById(reqDoc.user);
    user.registeredDevice = {
      id: reqDoc.newDeviceId,
      name: reqDoc.newDeviceInfo?.name || "approved device",
      registeredAt: new Date(),
    };
    await user.save();
    reqDoc.status = "approved";
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();
    // Mark any other pending requests for the same user as rejected (avoid lingering pending state)
    try {
      await DeviceChangeRequest.updateMany(
        { user: reqDoc.user, status: "pending", _id: { $ne: reqDoc._id } },
        {
          $set: {
            status: "rejected",
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            adminNote:
              "Automatically rejected - superseded by another approved request",
          },
        }
      );
    } catch (e) {
      console.error("failed to clear other pending device requests", e);
    }
    return res.json({ success: true, data: reqDoc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/requests/:id/reject  (admin)
router.post("/requests/:id/reject", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    const id = req.params.id;
    const reqDoc = await DeviceChangeRequest.findById(id);
    if (!reqDoc)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    if (reqDoc.status !== "pending")
      return res
        .status(422)
        .json({ success: false, message: "Request already reviewed" });
    reqDoc.status = "rejected";
    reqDoc.reviewedBy = req.user._id;
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = req.body.note;
    await reqDoc.save();
    return res.json({ success: true, data: reqDoc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/devices/requests/:id/cancel (employee) - cancel own pending request
router.post("/requests/:id/cancel", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const reqDoc = await DeviceChangeRequest.findById(id);
    if (!reqDoc)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    // Only owner can cancel and only when pending
    if (String(reqDoc.user) !== String(req.user._id))
      return res.status(403).json({ success: false, message: "Forbidden" });
    if (reqDoc.status !== "pending")
      return res.status(422).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });

    reqDoc.status = "cancelled";
    reqDoc.reviewedAt = new Date();
    reqDoc.adminNote = req.body.note || "Cancelled by user";
    await reqDoc.save();

    return res.json({ success: true, data: reqDoc });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/devices/requests/:id - delete a device-change request
router.delete("/requests/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const reqDoc = await DeviceChangeRequest.findById(id);
    if (!reqDoc)
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });

    // Only the request owner or an admin may delete
    if (
      String(reqDoc.user) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await reqDoc.remove();
    return res.json({ success: true, message: "Request deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/devices/requests (admin) - bulk delete by status (e.g., ?status=rejected)
router.delete("/requests", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    const status = req.query.status;
    if (!status)
      return res
        .status(422)
        .json({ success: false, message: "status query parameter required" });

    const allowed = ["pending", "approved", "rejected", "cancelled"];
    if (!allowed.includes(status))
      return res
        .status(422)
        .json({ success: false, message: "invalid status" });

    const result = await DeviceChangeRequest.deleteMany({ status });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
