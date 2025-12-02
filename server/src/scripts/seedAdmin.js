require("dotenv").config();
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

(async function seed() {
  try {
    await connectDB();
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin1234";

    let admin = await User.findOne({ email });
    if (admin) {
      console.log(`Admin user already exists: ${email}`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    admin = await User.create({
      name: "Administrator",
      email,
      passwordHash: hash,
      role: "admin",
    });
    console.log(`Created admin user: ${email} with password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed admin:", err.message || err);
    process.exit(1);
  }
})();
