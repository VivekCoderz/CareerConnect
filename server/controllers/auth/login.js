// Email and password login, logout, the current user, account deletion and user type.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const { authCookieBaseOptions } = require("../../utils/authCookies.js");
const { revokeCookieToken } = require("../../middleware/authMiddleware.js");
const { disconnectUser } = require("../../services/socketService.js");
const { deleteAccount } = require("../../services/accountDeletion.js");
const { generateToken, setTokenCookie, userPayload } = require("./shared");

// ==========================================
// LOGIN (Legacy — email/password via MongoDB bcrypt)
// For existing users who registered before Firebase was introduced.
// Firebase users use /firebase-login instead.
// ==========================================
module.exports.loginUser = async (req, res, next) => {
  try {
    const { email, username, password, keepSignedIn = false } = req.body;

    // Frontend se emailOrUsername bhi aa sakta hai
    const loginIdentifier = email || username || req.body.emailOrUsername;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required",
      });
    }

    const loginValue = loginIdentifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: loginValue }, { username: loginValue }],
    }).select("+password");

    // Unknown email and wrong password get the same answer, so accounts can't be discovered.
    const invalidCredentials = () => res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });

    if (!user) {
      return invalidCredentials();
    }

    // If user has a password set in MongoDB, verify it
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return invalidCredentials();
      }
    } else {
      // Account created via Google sign-in without a set password yet
      return res.status(401).json({
        success: false,
        code: "PASSWORD_NOT_SET",
        message:
          "No password has been set for this account yet. Please sign in with 'Continue with Google' to set your password, or use 'Forgot Password'.",
      });
    }

    // Checked after the password so only the account owner learns it is suspended.
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// DELETE MY ACCOUNT
// DELETE /api/auth/account
// body: { password } for accounts with a password, { confirm: "DELETE" } for Google-only accounts
// ==========================================
module.exports.deleteMyAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    if (["SUPER_ADMIN", "COMPANY_ADMIN", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin accounts are removed by a E2Job administrator.",
      });
    }

    const { password, confirm } = req.body || {};
    if (user.password) {
      if (typeof password !== "string" || !password || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, code: "INVALID_PASSWORD", message: "Password is incorrect." });
      }
    } else if (confirm !== "DELETE") {
      return res.status(400).json({ success: false, code: "CONFIRMATION_REQUIRED", message: 'Type "DELETE" to confirm.' });
    }

    await deleteAccount(user);
    disconnectUser(user._id);

    res.clearCookie("token", authCookieBaseOptions());
    res.clearCookie("sid", authCookieBaseOptions());

    return res.status(200).json({ success: true, message: "Your account and personal data have been deleted." });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGOUT
// ==========================================
module.exports.logoutUser = async (req, res) => {
  // Revoke the token itself, so a copy of it stops working too (H09).
  await revokeCookieToken(req);

  res.clearCookie("token", authCookieBaseOptions());
  // Left over from the removed server-side sessions; clearing it is harmless.
  res.clearCookie("sid", authCookieBaseOptions());

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// ==========================================
// GET ME (Current logged in user)
// ==========================================
module.exports.getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: userPayload(req.user),
  });
};

// ==========================================
// UPDATE USER TYPE / EXPERIENCE LEVEL
// ==========================================
module.exports.updateExperienceLevel = async (req, res, next) => {
  try {
    const { userType, experienceLevel } = req.body;
    const selectedType = userType || experienceLevel;

    const allowed = ["student", "fresher", "professional"];
    if (!allowed.includes(selectedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Allowed: student, fresher, professional",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        userType: selectedType,
      },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User type updated successfully",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};
