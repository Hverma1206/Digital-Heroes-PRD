function requireAdmin(req, res, next) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const requestUserEmail = String(req.user?.email || "").trim().toLowerCase();

  if (!adminEmail) {
    return res.status(500).json({ message: "ADMIN_EMAIL is not configured" });
  }

  if (!req.user || !requestUserEmail || requestUserEmail !== adminEmail) {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}

export default {
  requireAdmin,
};
