// Finishing a Google sign-up: candidate and employer onboarding.
// Split out of controllers/authController.js (H27); routes still import that file.
const User = require("../../models/User.js");
const StudentProfile = require("../../models/StudentProfile.js");
const FresherProfile = require("../../models/FresherProfile.js");
const { signupPreferenceFields } = require("../../utils/fresherPreferences");
const ProfessionalProfile = require("../../models/ProfessionalProfile.js");
const EmployerProfile = require("../../models/EmployerProfile.js");
const { getPlatformSettings } = require("../../services/platformSettings.js");
const { initialVerificationFields } = require("../../middleware/employerVerification.js");
const { CONSENT_REQUIRED, readConsent } = require("../../utils/consent.js");
const { FRESHER_EXPERIENCE_ERROR, isWorkExperienceAllowed } = require("../../utils/workExperience.js");
const { validatePhoneFormat } = require("../../middleware/validationMiddleware");
const { EMPLOYER_REGISTRATION_CLOSED, isPhoneAlreadyTaken, readOptionalEmployerPhone, userPayload } = require("./shared");

// ==========================================
// COMPLETE GOOGLE ONBOARDING
// Called after Google user has set password and selected a role.
// Saves phone, role-specific details, and (optionally) a resume URL.
// Protected — requires valid JWT cookie.
// ==========================================
module.exports.completeGoogleOnboarding = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      fullName,
      countryCode = "+91",
      phone,
      city,
      gender,
      languages = [],
      interests = [],
      workExperience,
      type,
      userType,
      linkedin,
      github,

      // Education fields
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

      // Optional resume
      resumeUrl,
    } = req.body;

    const userId = req.user.id;

    // Finishing onboarding is the Google signup; a profile completed earlier
    // (before consent was collected) is not asked again.
    const isNewSignup = !req.user.isProfileComplete;
    const consent = readConsent(req.body);
    if (isNewSignup && !consent) {
      return res.status(400).json(CONSENT_REQUIRED);
    }

    // -------- Basic Validation --------
    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        field: "phone",
        message: "Phone number is required",
      });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const cleanCountryCode = countryCode.trim() || "+91";

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

    const phoneExists = await isPhoneAlreadyTaken(cleanPhone, cleanCountryCode, userId);
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        field: "phone",
        message: "Mobile number is already registered",
      });
    }

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

    if (!isWorkExperienceAllowed(resolvedUserType, workExperience || experienceYears || "0 years")) {
      return res.status(400).json(FRESHER_EXPERIENCE_ERROR);
    }

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

    // -------- Update User document --------
    const updateData = {
      countryCode: cleanCountryCode,
      phone: cleanPhone,
      userType: resolvedUserType,
      city: city?.trim() || "",
      gender: gender || "",
      languages: Array.isArray(languages) ? languages : (languages ? [languages] : []),
      interests: Array.isArray(interests) ? interests : (interests ? [interests] : []),
      workExperience: resolvedWorkExp,
      college: resolvedCollege,
      course: resolvedCourse,
      stream: resolvedStream,
      startYear: startYearNum,
      endYear: endYearNum,
      socialLinks: {
        linkedin: linkedin?.trim() || "",
        github: github?.trim() || "",
      },
      profileCompletion: 90,
      isProfileComplete: true,
    };

    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (fullName) updateData.fullName = fullName.trim();
    if (resumeUrl) updateData.resumeUrl = resumeUrl.trim();
    if (isNewSignup) updateData.consent = consent;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // -------- Create or Update role-specific profile --------
    try {
      if (resolvedUserType === "student") {
        const existing = await StudentProfile.findOne({ userId });
        if (!existing) {
          await StudentProfile.create({
            userId,
            gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
              ? gender
              : undefined,
            location: {
              city: city?.trim() || "",
              country: "India",
            },
            interests: updateData.interests,
            technicalSkills: updateData.interests,
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
        } else {
          existing.location = existing.location || {};
          if (city) existing.location.city = city.trim();
          if (gender) existing.gender = gender;
          if (updateData.interests.length) {
            existing.interests = updateData.interests;
            existing.technicalSkills = updateData.interests;
          }
          if (!existing.education?.length) {
            existing.education = [
              {
                institution: resolvedCollege,
                degree: resolvedCourse,
                fieldOfStudy: resolvedStream,
                startYear: startYearNum,
                endYear: endYearNum,
                currentlyStudying: true,
              },
            ];
          }
          await existing.save();
        }
      } else if (resolvedUserType === "fresher") {
        const existing = await FresherProfile.findOne({ userId });
        if (!existing) {
          await FresherProfile.create({
            userId,
            ...signupPreferenceFields(updateData.interests),
            gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
              ? gender
              : "",
            location: {
              city: city?.trim() || "",
              country: "India",
            },
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
        }
      } else if (resolvedUserType === "professional") {
        const existing = await ProfessionalProfile.findOne({ userId });
        if (!existing) {
          await ProfessionalProfile.create({
            userId,
            gender: ["male", "female", "other", "prefer-not-to-say"].includes(gender)
              ? gender
              : "",
            location: {
              city: city?.trim() || "",
              country: "India",
            },
            skills: updateData.interests,
            currentEmployment: {
              // Only what the user entered; blanks stay blank (no invented employer).
              company: currentCompany?.trim() || "",
              jobTitle: jobTitle?.trim() || "",
              industry: industry?.trim() || "",
            },
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
      }
    } catch (profileErr) {
      console.error("[GoogleOnboarding] Profile creation error:", profileErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Profile setup complete",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// COMPLETE EMPLOYER GOOGLE ONBOARDING
// Called after employer Google user has set password.
// Collects company info and creates EmployerProfile.
// Protected — requires valid JWT cookie.
// ==========================================
module.exports.completeEmployerGoogleOnboarding = async (req, res, next) => {
  try {
    const {
      countryCode = "+91",
      phone,
      companyName,
      contactPerson,
      designation,
      website,
      companyType,
      industry,
      location,
    } = req.body;

    const userId = req.user.id;

    // Creating a new employer profile is an employer signup.
    const settings = await getPlatformSettings();
    const existingProfile = await EmployerProfile.findOne({ userId });
    if (!existingProfile && !settings.allowEmployerRegistration) {
      return res.status(403).json(EMPLOYER_REGISTRATION_CLOSED);
    }
    const consent = readConsent(req.body);
    if (!existingProfile && !consent) {
      return res.status(400).json(CONSENT_REQUIRED);
    }

    // -------- Validation --------
    const phoneCheck = readOptionalEmployerPhone(phone, countryCode);
    if (phoneCheck.error) return res.status(phoneCheck.status).json(phoneCheck.error);
    const { phone: cleanPhone, countryCode: cleanCountryCode } = phoneCheck;

    if (!companyName?.trim()) {
      return res.status(400).json({ success: false, field: "companyName", message: "Company name is required" });
    }
    if (!contactPerson?.trim()) {
      return res.status(400).json({ success: false, field: "contactPerson", message: "Contact person name is required" });
    }
    if (!designation?.trim()) {
      return res.status(400).json({ success: false, field: "designation", message: "Designation is required" });
    }
    if (!industry?.trim()) {
      return res.status(400).json({ success: false, field: "industry", message: "Industry is required" });
    }
    if (!location?.trim()) {
      return res.status(400).json({ success: false, field: "location", message: "Location is required" });
    }

    // -------- Update User --------
    const user = await User.findByIdAndUpdate(
      userId,
      {
        countryCode: cleanCountryCode,
        phone: cleanPhone,
        role: "employer",
        userType: "employer",
        profileCompletion: 40,
        onboardingCompletedAt: new Date(),
        ...(existingProfile ? {} : { consent }),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // -------- Create EmployerProfile (idempotent) --------
    try {
      if (!existingProfile) {
        await EmployerProfile.create({
          userId,
          companyName: companyName.trim(),
          officialEmail: user.email,
          mobile: cleanPhone,
          website: website?.trim() || "",
          companyType: companyType || "Private",
          industry: industry.trim(),
          headquarters: {
            city: location.trim(),
            state: "",
            country: "India",
          },
          recruiter: {
            name: contactPerson.trim(),
            designation: designation.trim(),
            email: user.email,
            phone: cleanPhone,
          },
          currentStep: 1,
          profileCompletion: 40,
          ...initialVerificationFields(settings),
        });
      }
    } catch (profileErr) {
      console.error("[EmployerGoogleOnboarding] Profile creation error:", profileErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Employer profile setup complete",
      user: userPayload(user),
    });
  } catch (error) {
    next(error);
  }
};
