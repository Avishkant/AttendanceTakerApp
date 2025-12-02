const mongoose = require("mongoose");

module.exports = async function connectDB() {
  // Support both MONGO_URI and MONGODB_URI environment variable names.
  // Prefer MONGO_URI (used in this project's .env), but fall back to MONGODB_URI.
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/attendance";

  try {
    await mongoose.connect(uri, {
      // keep defaults for modern mongoose versions
    });

    // Log which connection type we used (don't print full URI with credentials)
    if (process.env.MONGO_URI || process.env.MONGODB_URI) {
      const isLocal = uri.includes("127.0.0.1") || uri.includes("localhost");
      console.log(`MongoDB connected (${isLocal ? "local" : "remote"})`);
    } else {
      console.log("MongoDB connected (default local)");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // keep existing behavior of exiting so nodemon shows crash and you can fix env
    process.exit(1);
  }
};
