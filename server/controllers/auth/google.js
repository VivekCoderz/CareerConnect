// Google and Firebase sign-in, and cancelling an unfinished Google sign-up.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const { authCookieBaseOptions } = require("../../utils/authCookies.js");
const { getPlatformSettings } = require("../../services/platformSettings.js");
const getFirebaseAdmin = require("../../config/firebaseAdmin.js");
const { maskEmail } = require("../../services/emailValidationService.js");
const { generateToken, setTokenCookie, EMPLOYER_REGISTRATION_CLOSED, generateUniqueUsername, userPayload } = require("./shared");

// ==========================================
// FIREBASE LOGIN
// Handles login for all Firebase-authenticated users:
//   - Google sign-in (repeat logins)
//   - Email+password sign-in (Firebase-managed passwords)
//
// Frontend signs in via Firebase SDK → gets ID Token → sends here.
// Backend verifies the ID Token with Firebase Admin SDK → issues E2Job JWT.
// ==========================================
module.exports.firebaseLogin = async (req, res, next) => {
  try {
    const { idToken, keepSignedIn = false } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on this server",
      });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      console.error("[GoogleAuth Link] verifyIdToken failed:", firebaseErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please sign in again.",
      });
    }

    const { uid, email } = decoded;
    const normalizedEmail = email?.toLowerCase();
    const isGmail = Boolean(
      normalizedEmail?.endsWith("@gmail.com") || normalizedEmail?.endsWith("@googlemail.com")
    );
    let emailVerified =
      decoded.email_verified === true ||
      decoded.email_verified === "true" ||
      isGmail;

    if (!emailVerified && uid) {
      try {
        const fbUser = await admin.auth().getUser(uid);
        if (fbUser?.emailVerified || fbUser?.providerData?.some((p) => p.providerId === "google.com")) {
          emailVerified = true;
          admin.auth().updateUser(uid, { emailVerified: true }).catch(() => {});
        }
      } catch { /* If the Firebase lookup fails, the account stays unverified. */ }
    }

    if (!uid || !normalizedEmail || !emailVerified) {
      return res.status(403).json({ success: false, message: "Verify your email before signing in." });
    }

    // A verified email may link a legacy account, but an existing Firebase UID
    // must never be replaced by a different Firebase identity.
    let user = await User.findOne({ firebaseUid: uid }).select("+password");
    if (!user) user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No E2Job account found. Please sign up first or use Google sign-in.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
      });
    }

    // Link Firebase UID if this is a user logging in via Firebase for the first time
    if (user.firebaseUid && user.firebaseUid !== uid) {
      return res.status(409).json({ success: false, message: "This account is linked to another sign-in identity." });
    }
    if (!user.firebaseUid) {
      user = await User.findOneAndUpdate(
        { _id: user._id, firebaseUid: null },
        { $set: { firebaseUid: uid } },
        { returnDocument: "after" }
      ).select("+password");
      if (!user) return res.status(409).json({ success: false, message: "This account was linked to another sign-in identity." });
    }
    const isGoogle =
      decoded.firebase?.sign_in_provider === "google.com" ||
      Boolean(decoded.firebase?.identities?.["google.com"]) ||
      decoded.firebase?.sign_in_provider === "google";
    const provider = isGoogle ? "google" : "email";
    if (!user.authProviders.includes(provider)) {
      user.authProviders.push(provider);
    }

    user.lastLogin = new Date();
    await user.save();

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
// GOOGLE AUTH
// Called after signInWithPopup(auth, googleProvider) on the frontend.
// Creates a new MongoDB user for first-time Google sign-ins, or finds
// the existing one. Returns requiresPasswordSetup=true for new users
// so the frontend can route them to the Set Password page.
// ==========================================
module.exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken, keepSignedIn = false, role = "user" } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Firebase authentication is not configured on this server",
      });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseErr) {
      console.error("[GoogleAuth] verifyIdToken failed:", firebaseErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token. Please try again.",
      });
    }

    const { uid, email, name, picture } = decoded;
    const normalizedEmail = email?.toLowerCase();

    let isGoogleProvider =
      decoded.firebase?.sign_in_provider === "google.com" ||
      Boolean(decoded.firebase?.identities?.["google.com"]) ||
      decoded.firebase?.sign_in_provider === "google";

    const isGmail = Boolean(
      normalizedEmail?.endsWith("@gmail.com") || normalizedEmail?.endsWith("@googlemail.com")
    );

    // If not immediately marked as Google in token claims (e.g. linked accounts), check Firebase profile
    if (!isGoogleProvider && uid) {
      try {
        const fbUser = await admin.auth().getUser(uid);
        if (fbUser?.providerData?.some((p) => p.providerId === "google.com")) {
          isGoogleProvider = true;
        }
      } catch { /* If the Firebase lookup fails, the account stays unverified. */ }
    }

    let isEmailVerified =
      decoded.email_verified === true ||
      decoded.email_verified === "true" ||
      (isGoogleProvider && isGmail);

    if (!isEmailVerified && uid) {
      try {
        const fbUser = await admin.auth().getUser(uid);
        if (fbUser?.emailVerified || fbUser?.providerData?.some((p) => p.providerId === "google.com")) {
          isEmailVerified = true;
        }
      } catch { /* If the Firebase lookup fails, the account stays unverified. */ }
    }

    // Proactively sync Firebase user record if verified
    if (uid && isEmailVerified && decoded.email_verified !== true) {
      admin.auth().updateUser(uid, { emailVerified: true }).catch(() => {});
    }

    if (!uid || !normalizedEmail || !isGoogleProvider || !isEmailVerified) {
      console.warn("[GoogleAuth] Rejected Google sign-in claims:", {
        uid: Boolean(uid),
        email: maskEmail(normalizedEmail),
        email_verified: decoded.email_verified,
        sign_in_provider: decoded.firebase?.sign_in_provider,
        // Identity providers only; the identities object itself lists the user's emails.
        identities: Object.keys(decoded.firebase?.identities || {}),
        isGoogleProvider,
        isEmailVerified,
      });
      return res.status(403).json({
        success: false,
        message: !isGoogleProvider
          ? "A verified Google sign-in is required"
          : "Your Google account email is not verified. Please verify your email with Google or sign in with a verified Gmail account.",
      });
    }

    // Find existing user by Firebase UID or email
    let user = await User.findOne({ firebaseUid: uid }).select("+password");
    if (!user) user = await User.findOne({ email: normalizedEmail }).select("+password");

    let isNewUser = false;

    if (user) {
      // --- Existing user ---
      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended due to excessive requests or suspicious activity. Please contact support.",
        });
      }

      if (user.firebaseUid && user.firebaseUid !== uid) {
        const oldUid = user.firebaseUid;
        const unfinishedGoogleSignup = !user.password && !user.hasPassword &&
          !user.phone && !user.isProfileComplete &&
          user.authProviders.includes("google") && !user.authProviders.includes("email");
        if (!unfinishedGoogleSignup) {
          return res.status(409).json({ success: false, code: "ACCOUNT_IDENTITY_CONFLICT",
            message: "This email is linked to another sign-in identity. Use your original sign-in method or contact support." });
        }

        // A failed cancel request could leave this unfinished MongoDB record
        // behind after the browser deleted its Firebase user. Confirm that the
        // old identity is gone before allowing the same verified Google email
        // to recover the record. An existing or unverifiable UID stays locked.
        try {
          await admin.auth().getUser(oldUid);
          return res.status(409).json({ success: false, code: "PREVIOUS_IDENTITY_ACTIVE",
            message: "The previous sign-in identity is still active. Use your original sign-in method or contact support." });
        } catch (oldIdentityError) {
          if (oldIdentityError.code !== "auth/user-not-found") {
            return res.status(503).json({ success: false, code: "IDENTITY_CHECK_UNAVAILABLE",
              message: "We could not verify the previous sign-in identity. Please try again later." });
          }
        }
        user = await User.findOneAndUpdate(
          { _id: user._id, firebaseUid: oldUid, password: null, hasPassword: false,
            phone: "", isProfileComplete: false, authProviders: { $nin: ["email"] } },
          { $set: { firebaseUid: uid } },
          { returnDocument: "after" }
        ).select("+password");
        if (!user) return res.status(409).json({ success: false, code: "ACCOUNT_CHANGED_DURING_SIGN_IN",
          message: "The account changed during sign-in. Please try again." });
      }

      // Claim an unlinked account atomically to prevent concurrent UID replacement.
      if (!user.firebaseUid) {
        user = await User.findOneAndUpdate(
          { _id: user._id, firebaseUid: null },
          { $set: { firebaseUid: uid } },
          { returnDocument: "after" }
        ).select("+password");
        if (!user) return res.status(409).json({ success: false, message: "This account was linked to another sign-in identity." });
      }

      // Add google to providers if not present
      if (!user.authProviders.includes("google")) {
        user.authProviders.push("google");
      }

      // If user has no MongoDB password, ensure hasPassword is false
      if (!user.password && user.hasPassword) {
        user.hasPassword = false;
      }

      // Update profile image from Google if not set
      if (!user.profileImage && picture) {
        user.profileImage = picture;
      }
    } else {
      // --- New user: create MongoDB record ---
      isNewUser = true;
      const username = await generateUniqueUsername(normalizedEmail);

      // Determine role/userType from request (employer vs candidate)
      const isEmployer = role === "employer";
      if (isEmployer && !(await getPlatformSettings()).allowEmployerRegistration) {
        return res.status(403).json(EMPLOYER_REGISTRATION_CLOSED);
      }

      user = new User({
        fullName: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        firebaseUid: uid,
        authProviders: ["google"],
        hasPassword: false,
        isEmailVerified: true, // Google email is always verified
        profileImage: picture || "",
        username,
        role: isEmployer ? "employer" : "user",
        userType: isEmployer ? "employer" : "student", // employer stays employer; candidate will pick in /select-role
        phone: "",
      });

      await user.save({ validateBeforeSave: false });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const requiresPasswordSetup = !user.hasPassword || !user.password;
    if (requiresPasswordSetup && user.hasPassword) {
      user.hasPassword = false;
      await user.save({ validateBeforeSave: false });
    }

    // For users who still need to set a password, issue a short-lived token
    const effectiveKeepSignedIn = requiresPasswordSetup ? false : keepSignedIn;
    const token = generateToken(user, effectiveKeepSignedIn);
    setTokenCookie(res, token, effectiveKeepSignedIn);

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Google account connected successfully"
        : "Login successful",
      user: userPayload(user),
      requiresPasswordSetup,
      isNewUser,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CANCEL GOOGLE SIGNUP
// Called when user decides not to proceed with account creation on /set-password
// Cleans up the newly created uncompleted user record from MongoDB.
// ==========================================
module.exports.cancelGoogleSignup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    let deleted = false;
    // A legacy account can have a password hash but no hasPassword flag.
    // Only discard a genuinely unfinished Google-only signup.
    if (user && !user.password && user.hasPassword === false &&
        !user.phone && !user.isProfileComplete &&
        user.authProviders.includes("google") && !user.authProviders.includes("email")) {
      deleted = Boolean(await User.findOneAndDelete({
        _id: user._id, firebaseUid: user.firebaseUid, password: null,
        hasPassword: false, phone: "", isProfileComplete: false,
        authProviders: { $nin: ["email"] },
      }));
    }

    res.clearCookie("token", authCookieBaseOptions());
    res.clearCookie("sid", authCookieBaseOptions());


    return res.status(200).json({
      success: true,
      deleted,
      message: deleted ? "Google signup cancelled successfully" : "Signed out without deleting the account",
    });
  } catch (error) {
    next(error);
  }
};
