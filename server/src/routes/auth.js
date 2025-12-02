const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// POST /api/auth/register
// By default registration is allowed only when ALLOW_REGISTRATION=true (dev). Otherwise create users via admin routes.
router.post("/register", async (req, res) => {
  try {
    if (process.env.ALLOW_REGISTRATION !== "true") {
      return res.status(403).json({
        success: false,
        message: "Registration disabled. Create users via admin.",
      });
    }
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res
        .status(422)
        .json({ success: false, message: "Missing fields" });
    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await User.create({
      name,
      email,
      passwordHash: hash,
      role: role || "employee",
    });
    return res.json({
      success: true,
      data: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(422)
        .json({ success: false, message: "Missing email or password" });
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "replace-with-a-strong-secret",
      { expiresIn: process.env.JWT_EXPIRES || "365d" }
    );
    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
