module.exports = function (req, res, next) {
  const deviceId = req.headers["x-device-id"] || req.body.deviceId;
  if (!req.user)
    return res.status(401).json({ success: false, error: "No user" });
  const registered = req.user.registeredDevice && req.user.registeredDevice.id;
  if (!registered) {
    return res
      .status(403)
      .json({
        success: false,
        error: "No registered device. Please request device registration.",
      });
  }
  if (registered !== deviceId) {
    return res
      .status(403)
      .json({
        success: false,
        error: "Device mismatch. Request device change.",
      });
  }
  next();
};
