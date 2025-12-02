require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const deviceRoutes = require("./routes/devices");
const adminRoutes = require("./routes/admin");

const app = express();

connectDB();

app.use(helmet());

// Configure CORS to allow the front-end origin(s) from environment.
// `FRONTEND_URL` may be a single origin or a comma-separated list.
const frontendEnv = process.env.FRONTEND_URL || "";
const allowedOrigins = frontendEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  console.warn(
    "FRONTEND_URL not set in .env — CORS will allow localhost origins and all origins if origin is missing."
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (server-to-server, curl, mobile)
      if (!origin) return callback(null, true);

      try {
        const u = new URL(origin);
        const hostname = u.hostname;
        // Allow common localhost variants regardless of port when FRONTEND_URL isn't restrictive
        const isLocalhost = /(^localhost$)|(^127\.0\.0\.1$)|(^\[::1\]$)/i.test(
          hostname
        );

        if (allowedOrigins.length > 0) {
          // allow if origin exactly matches any allowed origin
          if (allowedOrigins.includes(origin)) return callback(null, true);
          // also allow if hostname matches and allowedOrigins contains a localhost entry
          if (
            isLocalhost &&
            allowedOrigins.some((o) => o.includes("localhost"))
          )
            return callback(null, true);
        } else {
          // No explicit allowed origins: allow localhost variants for development
          if (isLocalhost) return callback(null, true);
        }
      } catch (e) {
        // If parsing fails, fall through to rejection
      }

      console.error("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) =>
  res.json({ success: true, message: "Attendance API" })
);

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
