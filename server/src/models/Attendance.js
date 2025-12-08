const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["in", "out"], required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  deviceId: { type: String },
  status: {
    type: String,
    enum: ["recorded", "blocked", "pending"],
    default: "recorded",
  },
  note: { type: String },
  breaks: [
    {
      start: { type: Date, required: true },
      end: { type: Date },
    },
  ],
  onBreak: { type: Boolean, default: false },
});

module.exports = mongoose.model("Attendance", AttendanceSchema);

