const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["employee", "admin"], default: "employee" },
  registeredDevice: { type: DeviceSchema, default: null },
  allowedIPs: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
