const ipaddr = require("ipaddr.js");

module.exports = function (req, res, next) {
  let ip =
    req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];
  if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();

  const allowed = (process.env.COMPANY_ALLOWED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return next(); // no restriction configured

  try {
    const addr = ipaddr.parse(ip);
    for (const cidr of allowed) {
      if (!cidr) continue;
      if (cidr.includes("/")) {
        const range = ipaddr.parseCIDR(cidr);
        if (addr.match(range)) return next();
      } else {
        // single IP
        const single = ipaddr.parse(cidr);
        if (addr.toString() === single.toString()) return next();
      }
    }
  } catch (e) {
    console.warn("IP parse error", e.message);
  }

  return res.status(403).json({ success: false, error: "IP not allowed" });
};
