// Helpers used by more than one admin controller file.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const User = require("../../models/User");

/**
 * Helper to generate a unique lowercase username for admin users
 */
const generateAdminUsername = async (email, prefix = "admin") => {
  const base = (email ? email.split("@")[0] : prefix)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 18) || prefix;
  let candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
  let attempts = 0;
  while (attempts < 5) {
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
    candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    attempts++;
  }
  return `${base}_${Date.now().toString().slice(-4)}`;
};

module.exports = { generateAdminUsername };
