const mongoose = require("mongoose");

const DeviceChangeRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  newDeviceId: { type: String, required: true },
  newDeviceInfo: { type: Object },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  adminNote: { type: String },
});

module.exports = mongoose.model(
  "DeviceChangeRequest",
  DeviceChangeRequestSchema
);
