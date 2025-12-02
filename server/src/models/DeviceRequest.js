const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  newDeviceId: String,
  newDeviceInfo: Schema.Types.Mixed,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  adminNote: String,
});

module.exports = mongoose.model("DeviceRequest", DeviceRequestSchema);
