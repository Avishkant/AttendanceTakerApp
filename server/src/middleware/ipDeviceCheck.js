const ipaddr = require("ipaddr.js");
const DeviceChangeRequest = require("../models/DeviceChangeRequest");
const User = require("../models/User");

function parseForwardedIp(req) {
  // Try X-Forwarded-For then req.ip fallback
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return req.ip || req.connection.remoteAddress;
}

function ipInCidrs(ip, cidrList) {
  try {
    const parsed = ipaddr.parse(ip);
    for (const cidr of cidrList) {
      try {
        const parsedCidr = ipaddr.parseCIDR(cidr);
        if (parsed.match(parsedCidr)) return true;
      } catch (e) {
        // ignore invalid cidr values
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

module.exports = {
  parseForwardedIp,
  ipInCidrs,

  /**
   * Middleware to verify device & IP before allowing attendance marking.
   * If device mismatches, it creates a DeviceChangeRequest and returns 403.
   */
  verifyDeviceAndIp: async function (req, res, next) {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });

    const clientDeviceId =
      req.headers["x-device-id"] || req.body.deviceId || req.query.deviceId;
    const clientIp = parseForwardedIp(req);

    // Determine allowed IPs: env, DB settings, or user-specific
    const envCidrs = (process.env.COMPANY_ALLOWED_IPS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Try to include company IPs stored in DB settings (if available)
    let dbCidrs = [];
    try {
      // lazy require to avoid circular requires
      const Setting = require("../models/Setting");
      const setDoc = await Setting.findOne({
        key: "company_allowed_ips",
      }).lean();
      if (setDoc && Array.isArray(setDoc.value))
        dbCidrs = setDoc.value.map((s) => String(s).trim()).filter(Boolean);
    } catch (e) {
      // ignore DB errors and fall back to env
    }

    const allowedCidrs = (user.allowedIPs || [])
      .concat(dbCidrs)
      .concat(envCidrs);

    // Quick allow if any wildcard CIDR is present (convenience for testing)
    const hasWildcard = allowedCidrs.some((c) => {
      if (!c) return false;
      const s = String(c).trim();
      return s === "0.0.0.0/0" || s === "::/0" || s === "*";
    });

    const ipOk = hasWildcard
      ? true
      : allowedCidrs.length
      ? ipInCidrs(clientIp, allowedCidrs)
      : false;

    // If IP is invalid -> block
    if (!ipOk)
      return res.status(403).json({
        success: false,
        message: "Your IP is not within the allowed company network",
        ip: clientIp,
      });

    // Require a device id header/body/query for registration/matching
    if (!clientDeviceId)
      return res.status(400).json({
        success: false,
        message: "Missing device identifier (x-device-id)",
      });

    // If user is an admin, allow them to register or update their own device immediately
    if (user.role === "admin") {
      // If no registeredDevice or mismatch, update it automatically
      const currentId = user.registeredDevice && user.registeredDevice.id;
      if (!currentId || clientDeviceId !== currentId) {
        user.registeredDevice = {
          id: clientDeviceId,
          info: { ua: req.headers["user-agent"], ip: clientIp },
          updatedAt: new Date(),
        };
        await user.save();
      }
      req.clientIp = clientIp;
      req.clientDeviceId = clientDeviceId;
      return next();
    }

    // For non-admin users: if user has no registeredDevice, create a request to register new device (pending admin)
    if (!user.registeredDevice) {
      // If there's already a pending request for this user, don't create another
      const existing = await DeviceChangeRequest.findOne({
        user: user._id,
        status: "pending",
      });
      if (existing) {
        return res.status(403).json({
          success: false,
          message:
            "A device-change request is already pending. Please wait for admin approval.",
          requestId: existing._id,
        });
      }

      const reqDoc = await DeviceChangeRequest.create({
        user: user._id,
        newDeviceId: clientDeviceId || "unknown",
        newDeviceInfo: { ua: req.headers["user-agent"], ip: clientIp },
      });
      return res.status(403).json({
        success: false,
        message:
          "Device is not registered. Device change request pending admin approval.",
        requestId: reqDoc._id,
      });
    }

    // If device mismatch for non-admins
    if (clientDeviceId !== user.registeredDevice.id) {
      const existing = await DeviceChangeRequest.findOne({
        user: user._id,
        newDeviceId: clientDeviceId,
        status: "pending",
      });
      if (!existing) {
        await DeviceChangeRequest.create({
          user: user._id,
          newDeviceId: clientDeviceId || "unknown",
          newDeviceInfo: { ua: req.headers["user-agent"], ip: clientIp },
        });
      }
      return res.status(403).json({
        success: false,
        message: "Device mismatch. Please request device change.",
      });
    }

    // OK
    req.clientIp = clientIp;
    req.clientDeviceId = clientDeviceId;
    next();
  },
};
