const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "replace-with-a-strong-secret"
    );
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid token (user not found)" });
    req.user = user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid token", error: err.message });
  }
};
