const AuditLog = require("../../models/AuditLog");

// One audit line for a campus action. AuditLog.details is a string, so details are stored as
// JSON text. A failed write is logged and never undoes the action itself.
const audit = (user, action, target, details = {}) =>
  AuditLog.create({
    actorId: user?._id,
    actorName: user?.fullName || user?.email || "",
    actorEmail: user?.email || "",
    action,
    module: "Campus",
    target: String(target || ""),
    details: typeof details === "string" ? details : JSON.stringify(details),
  }).catch((error) => {
    console.error(`Campus audit log failed for ${action}:`, error.message);
    return null;
  });

module.exports = { audit };
