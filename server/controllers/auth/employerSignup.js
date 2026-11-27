// Employer sign-up with email and the verified code.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const EmployerProfile = require("../../models/EmployerProfile.js");
const { getPlatformSettings } = require("../../services/platformSettings.js");
const { initialVerificationFields } = require("../../middleware/employerVerification.js");
const { consumeVerifiedOtp } = require("../../services/otpService.js");
const { CONSENT_REQUIRED, readConsent } = require("../../utils/consent.js");
const { validatePassword, PASSWORD_VALIDATION_ERROR, generateToken, setTokenCookie, EMPLOYER_REGISTRATION_CLOSED, generateUniqueUsername, readOptionalEmployerPhone } = require("./shared");

// ==========================================
// REGISTER EMPLOYER
// ==========================================
module.exports.registerEmployer = async (req, res, next) => {
  try {
    const settings = await getPlatformSettings();
    if (!settings.allowEmployerRegistration) {
      return res.status(403).json(EMPLOYER_REGISTRATION_CLOSED);
    }

    const {
      companyName,
      email,
      verificationToken,
      countryCode = "+91",
      phone,
      password,
      confirmPassword,
      contactPerson,
      designation,
      website,
      companyType,
      industry,
      location,
      keepSignedIn = false,
    } = req.body;

    // ---------- Validation ----------
    const consent = readConsent(req.body);
    if (!consent) {
      return res.status(400).json(CONSENT_REQUIRED);
    }

    if (!companyName?.trim()) {
      return res.status(400).json({
        success: false,
        field: "companyName",
        message: "Company name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Official email is required",
      });
    }

    const phoneCheck = readOptionalEmployerPhone(phone, countryCode);
    if (phoneCheck.error) return res.status(phoneCheck.status).json(phoneCheck.error);
    const { phone: cleanPhone, countryCode: cleanCountryCode } = phoneCheck;

    if (!password) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password is required",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: PASSWORD_VALIDATION_ERROR,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        field: "confirmPassword",
        message: "Passwords do not match",
      });
    }

    if (!contactPerson?.trim()) {
      return res.status(400).json({
        success: false,
        field: "contactPerson",
        message: "Contact person is required",
      });
    }

    if (!designation?.trim()) {
      return res.status(400).json({
        success: false,
        field: "designation",
        message: "Designation is required",
      });
    }

    if (!companyType) {
      return res.status(400).json({
        success: false,
        field: "companyType",
        message: "Company type is required",
      });
    }

    if (!industry?.trim()) {
      return res.status(400).json({
        success: false,
        field: "industry",
        message: "Industry is required",
      });
    }

    if (!location?.trim()) {
      return res.status(400).json({
        success: false,
        field: "location",
        message: "Location is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Already registered?
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    if (!(await consumeVerifiedOtp(normalizedEmail, "verification", verificationToken))) {
      return res.status(403).json({ success: false, message: "Please verify your email first" });
    }

    // ---------- Create User (role: employer) ----------
    const user = await User.create({
      fullName: contactPerson.trim(),
      email: normalizedEmail,
      countryCode: cleanCountryCode,
      phone: cleanPhone,
      password,
      role: "employer",
      userType: "employer",
      username: await generateUniqueUsername(normalizedEmail),
      isEmailVerified: true,
      isProfileComplete: false,
      onboardingCompletedAt: new Date(),
      profileCompletion: 20,
      authProviders: ["email"],
      hasPassword: true,
      consent,
    });

    // ---------- Create Employer Profile ----------
    try {
      await EmployerProfile.create({
        userId: user._id,
        companyName: companyName.trim(),
        officialEmail: normalizedEmail,
        mobile: cleanPhone,
        website: website?.trim() || "",
        companyType: companyType || "Private",
        industry: industry?.trim() || "Information Technology",
        headquarters: {
          city: location?.trim() || "",
          state: "",
          country: "India",
        },
        recruiter: {
          name: contactPerson.trim(),
          designation: designation.trim(),
          email: normalizedEmail,
          phone: cleanPhone,
        },
        currentStep: 1,
        profileCompletion: 20,
        ...initialVerificationFields(settings),
      });
    } catch (profileErr) {
      console.error("EmployerProfile creation error:", profileErr);
    }

    const token = generateToken(user, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(201).json({
      success: true,
      message: "Employer account created successfully",
      user: {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        userType: user.userType,
        companyName: companyName.trim(),
        hasPassword: true,
        authProviders: ["email"],
        onboardingComplete: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
