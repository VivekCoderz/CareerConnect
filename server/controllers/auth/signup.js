// Candidate sign-up with email, password and the verified code.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const StudentProfile = require("../../models/StudentProfile.js");
const FresherProfile = require("../../models/FresherProfile.js");
const { signupPreferenceFields } = require("../../utils/fresherPreferences");
const ProfessionalProfile = require("../../models/ProfessionalProfile.js");
const { consumeVerifiedOtp } = require("../../services/otpService.js");
const { CONSENT_REQUIRED, readConsent } = require("../../utils/consent.js");
const { FRESHER_EXPERIENCE_ERROR, isWorkExperienceAllowed } = require("../../utils/workExperience.js");
const { validatePhoneFormat } = require("../../middleware/validationMiddleware");
const { validatePassword, PASSWORD_VALIDATION_ERROR, generateToken, setTokenCookie, generateUniqueUsername, isPhoneAlreadyTaken, userPayload } = require("./shared");

// ==========================================
// REGISTER (Multi-step form ke hisaab se)
// ==========================================
module.exports.registerUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      fullName,
      email,
      verificationToken,
      countryCode = "+91",
      phone,
      city,
      gender,
      languages = [],
      interests = [],
      workExperience,
      type,
      userType, // student | fresher | professional
      password,
      confirmPassword,
      linkedin,
      github,
      keepSignedIn = false,

      // Education & Career fields
      college,
      course,
      stream,
      startYear,
      endYear,
      year,
      graduationYear,

      // Legacy Fresher fields
      highestQualification,
      passoutYear,

      // Legacy Professional fields
      currentCompany,
      jobTitle,
      experienceYears,
      industry,

      // Resume uploaded during registration
      resumeUrl,
      resumeName,
    } = req.body;

    const finalFullName = (
      fullName ||
      `${firstName || ""} ${lastName || ""}`.trim() ||
      "User"
    ).trim();

    // -------------------- Validation --------------------
    const consent = readConsent(req.body);
    if (!consent) {
      return res.status(400).json(CONSENT_REQUIRED);
    }

    if (!finalFullName) {
      return res.status(400).json({
        success: false,
        field: "fullName",
        message: "Full name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Email is required",
      });
    }

    if (!phone || !phone.toString().trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Mobile number is required",
      });
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, "");
    const cleanCountryCode = countryCode?.trim() || "+91";

    if (!validatePhoneFormat(cleanPhone, cleanCountryCode)) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message:
          cleanCountryCode === "+91"
            ? "Please enter a valid 10-digit mobile number"
            : "Please enter a valid mobile number (6-15 digits)",
      });
    }

    // Check duplicate phone number
    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Mobile number is already registered",
      });
    }

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

    // Normalize userType (map "College student" -> "student", "Working professional" -> "professional")
    let resolvedUserType = (userType || type || "student").toString().toLowerCase();
    if (resolvedUserType.includes("college") || resolvedUserType.includes("student")) {
      resolvedUserType = "student";
    } else if (resolvedUserType.includes("fresh")) {
      resolvedUserType = "fresher";
    } else if (resolvedUserType.includes("prof") || resolvedUserType.includes("work")) {
      resolvedUserType = "professional";
    }

    if (!["student", "fresher", "professional"].includes(resolvedUserType)) {
      resolvedUserType = "student";
    }

    // Checked before the email verification token is used up, so the user can fix it and resubmit.
    if (!isWorkExperienceAllowed(resolvedUserType, workExperience || experienceYears || "0 years")) {
      return res.status(400).json(FRESHER_EXPERIENCE_ERROR);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        field: "email",
        message: "Email is already registered",
      });
    }

    // Verify OTP first (manual email registration requires verified OTP)
    if (!(await consumeVerifiedOtp(normalizedEmail, "verification", verificationToken))) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email with OTP first",
      });
    }

    // Derive years and education values cleanly
    const endYearNum =
      Number(endYear || graduationYear || passoutYear) ||
      new Date().getFullYear() + 2;
    const startYearNum =
      Number(startYear) ||
      (year ? endYearNum - Number(year) : endYearNum - 4);
    const resolvedCourse = course?.trim() || highestQualification?.trim() || "Degree";
    const resolvedCollege = college?.trim() || "University";
    const resolvedStream = stream?.trim() || "";
    const resolvedWorkExp = workExperience || experienceYears || "0 years";

    // -------------------- Prepare user data --------------------
    const userData = {
      fullName: finalFullName,
      firstName: firstName?.trim() || (finalFullName.split(" ")[0] || ""),
      lastName:
        lastName?.trim() ||
        (finalFullName.split(" ").slice(1).join(" ") || ""),
      email: normalizedEmail,
      countryCode: cleanCountryCode,
      phone: cleanPhone,
      city: city?.trim() || "",
      gender: gender || "",
      languages: Array.isArray(languages)
        ? languages
        : languages
        ? [languages]
        : [],
      interests: Array.isArray(interests)
        ? interests
        : interests
        ? [interests]
        : [],
      workExperience: resolvedWorkExp,
      college: resolvedCollege,
      course: resolvedCourse,
      stream: resolvedStream,
      startYear: startYearNum,
      endYear: endYearNum,
      password,
      userType: resolvedUserType,
      authProviders: ["email"],
      hasPassword: true,
      isEmailVerified: true,
      socialLinks: {
        linkedin: linkedin?.trim() || "",
        github: github?.trim() || "",
      },
      role: "user",
      username: await generateUniqueUsername(normalizedEmail),
      resumeUrl: resumeUrl?.trim() || "",
      resumeName: resumeName?.trim() || (resumeUrl ? "Uploaded Resume.pdf" : ""),
      consent,
    };

    // -------------------- Create user --------------------
    const user = await User.create(userData);

    // Initial resume data if uploaded during signup
    const initialResumeData = resumeUrl?.trim()
      ? {
          resumeUrl: resumeUrl.trim(),
          resumeName: resumeName?.trim() || "Uploaded Resume.pdf",
          uploadedAt: new Date(),
          isGenerated: false,
        }
      : undefined;

    // -------------------- Create role-specific profile --------------------
    try {
      if (resolvedUserType === "student") {
        await StudentProfile.create({
          userId: user._id,
          gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
            ? gender
            : undefined,
          location: {
            city: city?.trim() || "",
            country: "India",
          },
          interests: userData.interests,
          technicalSkills: userData.interests,
          ...(initialResumeData ? { resume: initialResumeData } : {}),
          education: [
            {
              institution: resolvedCollege,
              degree: resolvedCourse,
              fieldOfStudy: resolvedStream,
              startYear: startYearNum,
              endYear: endYearNum,
              currentlyStudying: true,
            },
          ],
        });
      } else if (resolvedUserType === "fresher") {
        await FresherProfile.create({
          userId: user._id,
          // The role and stack the fresher picked as interests, under the keys the dashboard reads.
          ...signupPreferenceFields(userData.interests),
          gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
            ? gender
            : "",
          location: {
            city: city?.trim() || "",
            country: "India",
          },
          ...(initialResumeData ? { resume: initialResumeData } : {}),
          education: [
            {
              institution: resolvedCollege,
              degree: resolvedCourse,
              specialization: resolvedStream,
              startYear: startYearNum,
              graduationYear: endYearNum,
              isHighest: true,
            },
          ],
        });
      } else if (resolvedUserType === "professional") {
        await ProfessionalProfile.create({
          userId: user._id,
          gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
            ? gender
            : "",
          location: {
            city: city?.trim() || "",
            country: "India",
          },
          skills: userData.interests,
          currentEmployment: {
            // Only what the user entered; blanks stay blank (no invented employer).
            company: currentCompany?.trim() || "",
            jobTitle: jobTitle?.trim() || "",
            industry: industry?.trim() || "",
          },
          ...(initialResumeData ? { resume: initialResumeData } : {}),
          education: [
            {
              institution: resolvedCollege,
              degree: resolvedCourse,
              fieldOfStudy: resolvedStream,
              startYear: startYearNum,
              endYear: endYearNum,
            },
          ],
        });
      }
    } catch (profileErr) {
      console.error(
        "Error creating role profile during registration:",
        profileErr.message
      );
    }

    const token = generateToken(user, keepSignedIn);
    setTokenCookie(res, token, keepSignedIn);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};
