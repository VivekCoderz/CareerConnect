const {
  generateResume,
  updateResume,
  parseResumeText,
  tailorResumeForOpportunity,
} = require("../services/aiResumeservice.js");
const Resume = require("../models/Resume.js");
const User = require("../models/User.js");
const StudentProfile = require("../models/StudentProfile.js");
const FresherProfile = require("../models/FresherProfile.js");
const ProfessionalProfile = require("../models/ProfessionalProfile.js");
const Job = require("../models/Job.js");
const Internship = require("../models/Internship.js");
const pdfParse = require("pdf-parse");
const { uploadResumeToCloudinary } = require("../config/cloudinary.js");
const { generateResumePdfBuffer } = require("../utils/generateResumePdf.js");
const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * POST /api/resume/generate
 * Body: { rawData, template }
 */
const generateResumeHandler = async (req, res) => {
  try {
    const { rawData, template, syncProfile } = req.body;

    if (!rawData || !rawData.personal) {
      return res.status(400).json({
        success: false,
        message: "rawData with personal info is required",
      });
    }

    if (!rawData.personal.fullName?.trim() || !rawData.personal.email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    // Gemini / mock – service decide karega
    const generated = await generateResume(rawData, template || "professional");

    if (syncProfile && req.user?._id) {
      try {
        const user = await User.findById(req.user._id).lean();
        if (user) await syncProfileFromResume(user, rawData);
      } catch (profileErr) {
        console.error(
          "Profile sync failed (resume still saved):",
          profileErr.message,
        );
      }
    }

    // Optional DB save (fail hone pe bhi response return hoga)
    if (req.user?._id) {
      try {
        await Resume.findOneAndUpdate(
          { user: req.user._id },
          {
            user: req.user._id,
            rawData,
            generatedData: generated,
            selectedTemplate: template || "professional",
          },
          { upsert: true, new: true },
        );
      } catch (dbErr) {
        console.error("Resume save failed (non-blocking):", dbErr.message);
      }
    }

    return res.status(200).json(generated);
  } catch (error) {
    console.error("generateResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate resume",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/update
 * Body: { currentResume, instruction }
 */
const updateResumeHandler = async (req, res) => {
  try {
    const { currentResume, instruction } = req.body;

    if (!currentResume) {
      return res.status(400).json({
        success: false,
        message: "currentResume is required",
      });
    }

    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({
        success: false,
        message: "instruction is required",
      });
    }

    const updated = await updateResume(
      currentResume,
      String(instruction).trim(),
    );

    if (req.user?._id) {
      try {
        await Resume.findOneAndUpdate(
          { user: req.user._id },
          { generatedData: updated },
          { new: true },
        );
      } catch (dbErr) {
        console.error(
          "Resume update save failed (non-blocking):",
          dbErr.message,
        );
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: error.message,
    });
  }
};

const syncPrimaryResumeWithProfile = async (userId, resume) => {
  try {
    const resumeName = resume.title || "CareerConnect Resume";
    const userUpdates = { resumeName };
    if (resume.resumeUrl) {
      userUpdates.resumeUrl = resume.resumeUrl;
    }
    await User.findByIdAndUpdate(userId, userUpdates);

    const profileUpdates = {
      "resume.resumeName": resumeName,
      "resume.updatedAt": new Date(),
    };
    if (resume.resumeUrl) {
      profileUpdates["resume.resumeUrl"] = resume.resumeUrl;
    }

    await StudentProfile.findOneAndUpdate(
      { userId },
      { $set: profileUpdates }
    );
    await FresherProfile.findOneAndUpdate(
      { userId },
      { $set: profileUpdates }
    );
    await ProfessionalProfile.findOneAndUpdate(
      { userId },
      { $set: profileUpdates }
    );
  } catch (err) {
    console.warn("syncPrimaryResumeWithProfile error:", err.message);
  }
};

/**
 * GET /api/resume/me (Active / Primary or Latest resume)
 */
const getMyResume = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const resume = await Resume.findOne({ user: req.user._id }).sort({ isPrimary: -1, updatedAt: -1 });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found",
      });
    }

    return res.status(200).json(resume);
  } catch (error) {
    console.error("getMyResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume",
      error: error.message,
    });
  }
};

/**
 * GET /api/resume (Get all resumes saved by user)
 */
const getAllResumes = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const resumes = await Resume.find({ user: req.user._id })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("getAllResumes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resumes",
      error: error.message,
    });
  }
};

/**
 * GET /api/resume/:id (Get single resume by id)
 */
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }
    return res.status(200).json({ success: true, resume });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/resume/save (Save Final Resume with title & primary option)
 */
const saveFinalResume = async (req, res) => {
  try {
    const { title, template, rawData, generatedData, isPrimary, resumeId } = req.body;

    if (!generatedData) {
      return res.status(400).json({
        success: false,
        message: "generatedData is required to save final resume",
      });
    }

    const resumeTitle = (title || "").trim() || `${generatedData.personal?.fullName || "My"} Resume`;
    const selectedTemplate = template || "classic";

    // 1. Generate PDF buffer and upload directly to Cloudinary
    let cloudinaryUrl = "";
    try {
      const pdfBuffer = await generateResumePdfBuffer(
        generatedData,
        selectedTemplate,
        resumeTitle
      );
      const cleanFileName = `${resumeTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      const uploadResult = await uploadResumeToCloudinary(
        pdfBuffer,
        cleanFileName,
        req.user._id.toString()
      );
      if (uploadResult?.secure_url) {
        cloudinaryUrl = uploadResult.secure_url;
      }
    } catch (uploadErr) {
      console.warn("Cloudinary resume upload warning:", uploadErr.message);
    }

    let resume = null;
    if (resumeId) {
      resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
      if (resume) {
        resume.title = resumeTitle;
        resume.selectedTemplate = selectedTemplate;
        if (rawData) resume.rawData = rawData;
        resume.generatedData = generatedData;
        if (cloudinaryUrl) resume.resumeUrl = cloudinaryUrl;
        if (isPrimary !== undefined) resume.isPrimary = isPrimary;
        await resume.save();
      }
    }

    if (!resume) {
      const existingCount = await Resume.countDocuments({ user: req.user._id });
      const makePrimary = isPrimary !== undefined ? isPrimary : existingCount === 0;

      if (makePrimary) {
        await Resume.updateMany({ user: req.user._id }, { isPrimary: false });
      }

      resume = await Resume.create({
        user: req.user._id,
        title: resumeTitle,
        selectedTemplate,
        rawData: rawData || {},
        generatedData,
        resumeUrl: cloudinaryUrl,
        isPrimary: makePrimary,
      });
    } else if (isPrimary) {
      await Resume.updateMany(
        { user: req.user._id, _id: { $ne: resume._id } },
        { isPrimary: false }
      );
    }

    if (resume.isPrimary) {
      await syncPrimaryResumeWithProfile(req.user._id, resume);
    }

    return res.status(200).json({
      success: true,
      message: `Resume "${resume.title}" saved & uploaded to Cloudinary successfully!`,
      resume,
      resumeUrl: resume.resumeUrl,
    });
  } catch (error) {
    console.error("saveFinalResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save resume",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/resume/:id/primary (Set a resume as primary)
 */
const setPrimaryResume = async (req, res) => {
  try {
    const { id } = req.params;
    await Resume.updateMany({ user: req.user._id }, { isPrimary: false });

    let resume = await Resume.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isPrimary: true },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    // If resume does not have Cloudinary URL yet, compile and upload now
    if (!resume.resumeUrl && resume.generatedData) {
      try {
        const pdfBuffer = await generateResumePdfBuffer(
          resume.generatedData,
          resume.selectedTemplate || "classic",
          resume.title
        );
        const cleanFileName = `${(resume.title || "Resume").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
        const uploadResult = await uploadResumeToCloudinary(
          pdfBuffer,
          cleanFileName,
          req.user._id.toString()
        );
        if (uploadResult?.secure_url) {
          resume.resumeUrl = uploadResult.secure_url;
          await resume.save();
        }
      } catch (uploadErr) {
        console.warn("Cloudinary upload on setPrimary warning:", uploadErr.message);
      }
    }

    await syncPrimaryResumeWithProfile(req.user._id, resume);

    return res.status(200).json({
      success: true,
      message: `"${resume.title}" set as your primary resume!`,
      resume,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/resume/:id (Delete a saved resume)
 */
const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Resume.findOneAndDelete({ _id: id, user: req.user._id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    if (deleted.isPrimary) {
      const nextResume = await Resume.findOne({ user: req.user._id }).sort({ updatedAt: -1 });
      if (nextResume) {
        nextResume.isPrimary = true;
        await nextResume.save();
        await syncPrimaryResumeWithProfile(req.user._id, nextResume);
      } else {
        await User.findByIdAndUpdate(req.user._id, { resumeName: "" });
        await StudentProfile.findOneAndUpdate(
          { userId: req.user._id },
          { $set: { "resume.resumeName": "" } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Resume "${deleted.title}" deleted successfully`,
      deletedId: id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/resume/manual
 * Body: { generatedData, resumeId }
 */
const saveManualEdit = async (req, res) => {
  try {
    const { generatedData, resumeId } = req.body;

    if (!generatedData) {
      return res.status(400).json({
        success: false,
        message: "generatedData is required",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    let resume;
    if (resumeId) {
      resume = await Resume.findOneAndUpdate(
        { _id: resumeId, user: req.user._id },
        { generatedData },
        { new: true }
      );
    }

    if (!resume) {
      resume = await Resume.findOneAndUpdate(
        { user: req.user._id },
        { generatedData },
        { new: true, sort: { isPrimary: -1, updatedAt: -1 } }
      );
    }

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found to update",
      });
    }

    return res.status(200).json(resume);
  } catch (error) {
    console.error("saveManualEdit error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save resume",
      error: error.message,
    });
  }
};



const splitSkills = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseResumeDate = (value) => {
  if (!value) return undefined;
  const match = String(value).match(/(?:^|\s)(\d{4})(?:\s|$)/);
  return match ? new Date(`${match[1]}-01-01`) : undefined;
};

const syncProfileFromResume = async (user, rawData, resumeUrl, resumeName) => {
  let effectiveType = (user.userType || "student").toLowerCase();
  if (effectiveType.includes("fresh")) effectiveType = "fresher";
  else if (effectiveType.includes("prof") || effectiveType.includes("work")) effectiveType = "professional";
  else effectiveType = "student";

  const ProfileModel = {
    student: StudentProfile,
    fresher: FresherProfile,
    professional: ProfessionalProfile,
  }[effectiveType];
  if (!ProfileModel) return;

  let profile = await ProfileModel.findOne({ userId: user._id });
  if (!profile) {
    profile = new ProfileModel({ userId: user._id });
  }

  const effectiveResumeUrl = resumeUrl || user.resumeUrl || "";
  const effectiveResumeName = resumeName || user.resumeName || "Uploaded Resume.pdf";

  if (effectiveResumeUrl) {
    profile.resume = {
      resumeUrl: effectiveResumeUrl,
      resumeName: effectiveResumeName,
      uploadedAt: profile.resume?.uploadedAt || new Date(),
      isGenerated: false,
    };
  }

  const locationParts = String(rawData.personal?.location || user.city || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  profile.location = {
    ...profile.location?.toObject?.(),
    city: locationParts[0] || user.city || "",
    state: locationParts[1] || "",
    country: locationParts.slice(2).join(", ") || "India",
  };

  profile.socialLinks = {
    ...profile.socialLinks?.toObject?.(),
    linkedin: String(rawData.personal?.linkedin || user.socialLinks?.linkedin || "").trim(),
    github: String(rawData.personal?.github || user.socialLinks?.github || "").trim(),
    portfolio: String(rawData.personal?.portfolio || user.socialLinks?.portfolio || "").trim(),
  };

  if (rawData.summary) {
    if ("bio" in profile) profile.bio = rawData.summary;
    if ("careerObjective" in profile) profile.careerObjective = rawData.summary;
    if ("summary" in profile) profile.summary = rawData.summary;
  }

  const rawEduList =
    rawData.education && rawData.education.length > 0
      ? rawData.education
      : user.college || user.course
      ? [
          {
            college: user.college,
            degree: user.course,
            branch: user.stream,
            startYear: user.startYear,
            endYear: user.endYear,
          },
        ]
      : [];

  const education = rawEduList.map((item) => ({
    institution: item.college?.trim() || user.college?.trim() || "University",
    degree: item.degree?.trim() || user.course?.trim() || "Bachelor of Technology",
    specialization: item.branch?.trim() || user.stream?.trim() || "Computer Science",
    fieldOfStudy: item.branch?.trim() || user.stream?.trim() || "Computer Science",
    percentageOrCgpa: item.cgpa?.trim() || "",
    grade: item.cgpa?.trim() || "",
    graduationYear: Number(item.endYear) || user.endYear || undefined,
    endYear: Number(item.endYear) || user.endYear || undefined,
    startYear: Number(item.startYear) || user.startYear || undefined,
    currentlyStudying: !item.endYear || Number(item.endYear) >= new Date().getFullYear(),
  }));

  const projects = (rawData.projects || [])
    .filter((item) => item.name || item.title || item.description)
    .map((item) => ({
      title: item.title?.trim() || item.name?.trim() || "Personal Project",
      name: item.name?.trim() || item.title?.trim() || "Personal Project",
      description:
        item.description?.trim() ||
        "Developed full-stack web application with responsive UI, secure authentication, and database integration.",
      technologies: splitSkills(item.technologies),
      githubUrl: item.github?.trim() || item.githubUrl?.trim() || "",
      liveUrl: item.live?.trim() || item.liveUrl?.trim() || "",
      projectType: "Personal",
    }));

  const experience = (rawData.experience || [])
    .filter((item) => item.company || item.role || item.description)
    .map((item) => ({
      organization: item.company?.trim() || "Company",
      companyName: item.company?.trim() || "Company",
      role: item.role?.trim() || "Intern",
      jobTitle: item.role?.trim() || "Intern",
      description: item.description?.trim() || "",
      startDate: parseResumeDate(item.duration),
    }));

  const certifications = (rawData.certifications || [])
    .filter((item) => item.name || item.issuer)
    .map((item) => ({
      name: item.name?.trim() || "Certification",
      issuingOrganization: item.issuer?.trim() || "Issuing Organization",
      issueDate: item.year ? new Date(`${item.year}-01-01`) : undefined,
    }));

  const achievements = (rawData.achievements || [])
    .filter((item) => item.title || item.description)
    .map((item) => ({
      title: item.title?.trim() || "Achievement",
      description: item.description?.trim() || "",
    }));

  if (effectiveType === "student") {
    if (education.length > 0) profile.education = education;
    if (projects.length > 0) profile.projects = projects;
    if (experience.length > 0) profile.experience = experience;
    profile.technicalSkills = [
      ...splitSkills(rawData.skills?.programmingLanguages),
      ...splitSkills(rawData.skills?.frameworks),
      ...splitSkills(rawData.skills?.tools),
    ];
    profile.softSkills = splitSkills(rawData.skills?.other);
    profile.interests =
      profile.interests && profile.interests.length > 0
        ? profile.interests
        : profile.technicalSkills.slice(0, 10);
  } else if (effectiveType === "fresher") {
    if (education.length > 0) {
      profile.education = education.map((e) => ({
        degree: e.degree,
        specialization: e.specialization,
        institution: e.institution,
        percentageOrCgpa: e.percentageOrCgpa,
        graduationYear: e.graduationYear,
        isHighest: true,
      }));
    }
    if (projects.length > 0) profile.projects = projects;
    if (experience.length > 0) profile.internships = experience;
    profile.skills = {
      ...profile.skills?.toObject?.(),
      programmingLanguages: splitSkills(rawData.skills?.programmingLanguages).map((name) => ({
        name,
        proficiency: "Intermediate",
      })),
      frameworks: splitSkills(rawData.skills?.frameworks).map((name) => ({
        name,
        proficiency: "Intermediate",
      })),
      tools: splitSkills(rawData.skills?.tools).map((name) => ({
        name,
        proficiency: "Intermediate",
      })),
      databases: splitSkills(rawData.skills?.databases || []).map((name) => ({
        name,
        proficiency: "Intermediate",
      })),
    };
  } else {
    // Professional
    if (education.length > 0) profile.education = education;
    if (projects.length > 0) profile.projects = projects;
    if (experience.length > 0) profile.workExperience = experience;
    profile.skills = [
      ...splitSkills(rawData.skills?.programmingLanguages),
      ...splitSkills(rawData.skills?.frameworks),
      ...splitSkills(rawData.skills?.tools),
    ];
  }

  if (certifications.length > 0) profile.certifications = certifications;
  if (achievements.length > 0) profile.achievements = achievements;
  profile.isProfileComplete = true;
  profile.profileCompletion = 100;
  await profile.save({ validateBeforeSave: false });

  const primaryEdu = education[0] || {};
  const allExtractedSkills = [
    ...splitSkills(rawData.skills?.programmingLanguages),
    ...splitSkills(rawData.skills?.frameworks),
    ...splitSkills(rawData.skills?.tools),
  ];

  await User.findByIdAndUpdate(user._id, {
    $set: {
      fullName: String(rawData.personal?.fullName || user.fullName || "").trim(),
      phone: String(user.phone || rawData.personal?.phone || "").trim(),
      city: String(locationParts[0] || user.city || "").trim(),
      college: String(primaryEdu.institution || user.college || "").trim(),
      course: String(primaryEdu.degree || user.course || "").trim(),
      stream: String(primaryEdu.specialization || primaryEdu.fieldOfStudy || user.stream || "").trim(),
      startYear: Number(primaryEdu.startYear) || user.startYear || undefined,
      endYear: Number(primaryEdu.endYear || primaryEdu.graduationYear) || user.endYear || undefined,
      interests:
        user.interests && user.interests.length > 0 ? user.interests : allExtractedSkills.slice(0, 10),
      isProfileComplete: true,
      profileCompletion: 100,
      socialLinks: {
        linkedin: String(rawData.personal?.linkedin || user.socialLinks?.linkedin || "").trim(),
        github: String(rawData.personal?.github || user.socialLinks?.github || "").trim(),
        portfolio: String(rawData.personal?.portfolio || user.socialLinks?.portfolio || "").trim(),
      },
      ...(effectiveResumeUrl
        ? {
            resumeUrl: effectiveResumeUrl,
            resumeName: effectiveResumeName,
          }
        : {}),
    },
  });
};

// ─── Helper: format a Date or string to "Mon YYYY" ───────────────────────────
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// ─── Helper: join array of skill items (objects or strings) into CSV string ──
const skillsToString = (arr = []) =>
  arr
    .map((s) => (typeof s === "string" ? s : s.name || ""))
    .filter(Boolean)
    .join(", ");

/**
 * GET /api/resume/profile-data
 * Reads the authenticated user's profile and maps it to the resume rawData shape.
 * Works for student, fresher, and professional user types.
 */
const getProfileForResume = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { userType, fullName, email, phone, socialLinks } = user;
    let profile = null;
    let profileFound = false;

    // ── Fetch role-specific profile ────────────────────────────────────────
    if (userType === "student") {
      profile = await StudentProfile.findOne({ userId: user._id }).lean();
    } else if (userType === "fresher") {
      profile = await FresherProfile.findOne({ userId: user._id }).lean();
    } else if (userType === "professional") {
      profile = await ProfessionalProfile.findOne({ userId: user._id }).lean();
    }

    if (profile) profileFound = true;

    // ── Personal ──────────────────────────────────────────────────────────
    let location = "";
    if (profile?.location) {
      const { city, state, country } = profile.location;
      location = [city, state, country].filter(Boolean).join(", ");
    }

    const rawData = {
      personal: {
        fullName: fullName || "",
        email: email || "",
        phone: phone || "",
        location,
        linkedin: profile?.socialLinks?.linkedin || socialLinks?.linkedin || "",
        github: profile?.socialLinks?.github || socialLinks?.github || "",
        portfolio: profile?.socialLinks?.portfolio || "",
      },
      education: [],
      skills: {
        programmingLanguages: "",
        frameworks: "",
        tools: "",
        other: "",
      },
      projects: [],
      experience: [],
      certifications: [],
      achievements: [],
    };

    // ── Education ─────────────────────────────────────────────────────────
    if (profile?.education?.length) {
      rawData.education = profile.education.map((edu) => {
        let level = "undergraduate";
        const deg = (edu.degree || "").toLowerCase();
        const qType = (edu.qualificationType || "").toLowerCase();
        if (
          qType === "10th" ||
          deg.includes("10th") ||
          (deg.includes("secondary") && !deg.includes("senior")) ||
          deg.includes("matric") ||
          deg.includes("high school")
        ) {
          level = "10th";
        } else if (
          qType === "12th" ||
          deg.includes("12th") ||
          deg.includes("senior secondary") ||
          deg.includes("intermediate") ||
          deg.includes("higher secondary")
        ) {
          level = "12th";
        } else if (
          qType === "diploma" ||
          deg.includes("diploma") ||
          deg.includes("polytechnic")
        ) {
          level = "diploma";
        } else if (
          qType === "mca" ||
          qType === "m.sc" ||
          deg.includes("master") ||
          deg.includes("mba") ||
          deg.includes("mca") ||
          deg.includes("m.tech") ||
          deg.includes("postgraduate")
        ) {
          level = "postgraduate";
        } else if (qType === "other") {
          level = "other";
        }

        const inst = edu.institution || "";
        const branchVal = edu.fieldOfStudy || edu.specialization || "";
        const scoreVal =
          edu.percentageOrCgpa ||
          edu.grade ||
          (edu.academicGrade ? edu.academicGrade : "") ||
          "";
        const startYr = edu.startYear ? String(edu.startYear) : "";
        const endYr = edu.endYear
          ? String(edu.endYear)
          : edu.graduationYear
            ? String(edu.graduationYear)
            : "";

        return {
          id: String(edu._id || crypto.randomUUID()),
          level,
          college: inst,
          school: inst,
          institution: inst,
          degree:
            edu.degree ||
            (level === "10th"
              ? "10th / Secondary"
              : level === "12th"
                ? "12th / Senior Secondary"
                : ""),
          branch: branchVal,
          stream: branchVal,
          specialization: branchVal,
          cgpa: scoreVal,
          percentage: scoreVal,
          startYear: startYr,
          endYear: endYr,
          passingYear: endYr,
          location: edu.location || "",
        };
      });

      // Professional reverse-chronological order (highest education first, followed by 12th and 10th)
      const levelRank = (lvl, d = "") => {
        const l = String(lvl || "").toLowerCase();
        const dg = String(d || "").toLowerCase();
        if (l === "postgraduate" || dg.includes("master") || dg.includes("mba") || dg.includes("mca")) return 1;
        if (l === "undergraduate" || dg.includes("b.tech") || dg.includes("bachelor") || dg.includes("bca")) return 2;
        if (l === "diploma" || dg.includes("diploma")) return 3;
        if (l === "other") return 4;
        if (l === "12th" || dg.includes("12th") || dg.includes("senior secondary")) return 5;
        if (l === "10th" || dg.includes("10th") || dg.includes("secondary")) return 6;
        return 2;
      };

      rawData.education.sort((a, b) => {
        const rA = levelRank(a.level, a.degree);
        const rB = levelRank(b.level, b.degree);
        if (rA !== rB) return rA - rB;
        const yA = parseInt(a.endYear || a.passingYear || a.startYear || "0", 10) || 0;
        const yB = parseInt(b.endYear || b.passingYear || b.startYear || "0", 10) || 0;
        return yB - yA;
      });
    }
    if (!rawData.education.length) {
      rawData.education = [
        {
          id: "default",
          level: "undergraduate",
          college: "",
          school: "",
          institution: "",
          degree: "",
          branch: "",
          stream: "",
          specialization: "",
          cgpa: "",
          percentage: "",
          startYear: "",
          endYear: "",
          passingYear: "",
          location: "",
        },
      ];
    }

    // ── Skills ────────────────────────────────────────────────────────────
    if (userType === "fresher" && profile?.skills) {
      rawData.skills.programmingLanguages = skillsToString(
        profile.skills.programmingLanguages,
      );
      rawData.skills.frameworks = skillsToString(profile.skills.frameworks);
      rawData.skills.tools = skillsToString(profile.skills.tools);
      const others = [
        ...(profile.skills.databases || []),
        ...(profile.skills.technical || []),
        ...(profile.skills.softSkills || []),
      ];
      rawData.skills.other = skillsToString(others);
    } else if (
      userType === "student" &&
      (profile?.technicalSkills?.length || profile?.softSkills?.length)
    ) {
      rawData.skills.programmingLanguages = (
        profile.technicalSkills || []
      ).join(", ");
      rawData.skills.other = (profile.softSkills || []).join(", ");
    } else if (userType === "professional" && profile?.skills) {
      rawData.skills.programmingLanguages = skillsToString(
        profile.skills.programmingLanguages || [],
      );
      rawData.skills.frameworks = skillsToString(
        profile.skills.frameworks || [],
      );
      rawData.skills.tools = skillsToString(profile.skills.tools || []);
      const others = [
        ...(profile.skills.databases || []),
        ...(profile.skills.softSkills || []),
      ];
      rawData.skills.other = skillsToString(others);
    }

    // ── Projects ──────────────────────────────────────────────────────────
    if (profile?.projects?.length) {
      rawData.projects = profile.projects.map((p) => ({
        id: String(p._id || crypto.randomUUID()),
        name: p.title || p.name || "",
        technologies: (p.technologies || []).join(", "),
        description: p.description || "",
        github: p.githubUrl || "",
        live: p.liveUrl || "",
      }));
    }
    if (!rawData.projects.length) {
      rawData.projects = [
        {
          id: "default",
          name: "",
          technologies: "",
          description: "",
          github: "",
          live: "",
        },
      ];
    }

    // ── Experience ────────────────────────────────────────────────────────
    // fresher → internships; student → experience; professional → workExperience
    const expSource =
      userType === "fresher"
        ? profile?.internships || []
        : userType === "professional"
          ? profile?.workExperience || []
          : profile?.experience || [];

    if (expSource.length) {
      rawData.experience = expSource.map((exp) => {
        const company = exp.companyName || exp.organization || "";
        const role = exp.role || exp.jobTitle || "";
        const start = formatDate(exp.startDate);
        const end = exp.currentlyWorking ? "Present" : formatDate(exp.endDate);
        const duration = start ? (end ? `${start} – ${end}` : start) : "";
        const description = [
          exp.description,
          exp.responsibilities,
          exp.achievements,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          id: String(exp._id || crypto.randomUUID()),
          company,
          role,
          duration,
          description,
        };
      });
    }
    if (!rawData.experience.length) {
      rawData.experience = [
        { id: "default", company: "", role: "", duration: "", description: "" },
      ];
    }

    // ── Certifications ────────────────────────────────────────────────────
    if (profile?.certifications?.length) {
      rawData.certifications = profile.certifications.map((c) => ({
        id: String(c._id || crypto.randomUUID()),
        name: c.name || "",
        issuer: c.issuingOrganization || "",
        year: c.issueDate ? String(new Date(c.issueDate).getFullYear()) : "",
      }));
    }
    if (!rawData.certifications.length) {
      rawData.certifications = [
        { id: "default", name: "", issuer: "", year: "" },
      ];
    }

    // ── Achievements ──────────────────────────────────────────────────────
    if (profile?.achievements?.length) {
      rawData.achievements = profile.achievements.map((a) => ({
        id: String(a._id || crypto.randomUUID()),
        title: a.title || "",
        description: a.description || "",
      }));
    }
    if (!rawData.achievements.length) {
      rawData.achievements = [{ id: "default", title: "", description: "" }];
    }

    return res.status(200).json({ success: true, rawData, profileFound });
  } catch (error) {
    console.error("getProfileForResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load profile data for resume",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/upload
 * Uploads resume PDF to Cloudinary and saves URL in User and profile collections
 */
const uploadResumeHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume file provided. Please select a PDF, DOC, or DOCX file.",
      });
    }

    const original = (req.file.originalname || "").toLowerCase();
    const isAllowedExt =
      original.endsWith(".pdf") ||
      original.endsWith(".doc") ||
      original.endsWith(".docx");
    const isAllowedMime = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ].includes(req.file.mimetype);

    if (!isAllowedExt && !isAllowedMime) {
      return res.status(400).json({
        success: false,
        message: "Only PDF, DOC, and DOCX files are allowed for resume upload.",
      });
    }

    const userId = req.user._id;

    // 1. Upload to Cloudinary
    const uploadResult = await uploadResumeToCloudinary(
      req.file.buffer,
      req.file.originalname,
      userId.toString(),
    );

    const resumeUrl = uploadResult.secure_url;
    const resumeName = req.file.originalname;

    // 2. Save in User collection
    await User.findByIdAndUpdate(userId, {
      resumeUrl,
      resumeName,
    });

    // 3. Save in role-specific profile collection
    const resumeData = {
      resumeUrl,
      resumeName,
      uploadedAt: new Date(),
    };

    if (req.user.userType === "student") {
      await StudentProfile.findOneAndUpdate(
        { userId },
        { resume: resumeData },
        { new: true, upsert: true },
      );
    } else if (req.user.userType === "fresher") {
      await FresherProfile.findOneAndUpdate(
        { userId },
        { resume: resumeData },
        { new: true, upsert: true },
      );
    } else if (req.user.userType === "professional") {
      await ProfessionalProfile.findOneAndUpdate(
        { userId },
        { resume: resumeData },
        { new: true, upsert: true },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully to Cloudinary",
      resumeUrl,
      resumeName,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error("uploadResumeHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload resume to Cloudinary",
      error: error.message,
    });
  }
};

/**
 * Helper: Extract raw text from PDF buffer using pdf-parse
 */
const extractTextFromPdfBuffer = async (buffer) => {
  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    if (typeof parser.destroy === "function") {
      await parser.destroy();
    }
    return textResult?.text || "";
  } catch (err) {
    console.warn("PDF text extraction warning:", err.message);
    return "";
  }
};

/**
 * Helper: Parse resume text using Gemini AI into structured JSON
 */
const parseResumeTextWithAi = async (rawText, user) => {
  if (!rawText || !rawText.trim()) return null;

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes("your_gemini")) return null;

  const prompt = `You are an expert AI Resume Parser.
Analyze the following resume plain text and extract all relevant candidate information into a strictly valid JSON object.
Do NOT invent false information; extract what is present in the resume. If a field is not mentioned, use sensible empty defaults ("" or []).

The response MUST be ONLY a valid JSON object matching this structure (no markdown fences, no backticks, no explanations):
{
  "personal": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "summary": "",
  "education": [
    {
      "college": "",
      "degree": "",
      "branch": "",
      "cgpa": "",
      "startYear": "",
      "endYear": ""
    }
  ],
  "skills": {
    "programmingLanguages": ["JavaScript", "Python"],
    "frameworks": ["React", "Node.js"],
    "tools": ["Git", "Docker"],
    "other": ["Communication", "Problem Solving"]
  },
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "technologies": "",
      "description": "",
      "github": "",
      "live": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "year": ""
    }
  ],
  "achievements": [
    {
      "title": "",
      "description": ""
    }
  ]
}

RESUME TEXT:
${rawText.slice(0, 10000)}
`;

  const genAI = new GoogleGenerativeAI(key);
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter(Boolean);
  const uniqueModels = [...new Set(modelsToTry)];

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text() || "{}";
      const cleanJson = responseText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn(`AI resume parsing with ${modelName} warning:`, err.message);
    }
  }

  return null;
};

/**
 * POST /api/resume/upload-and-parse
 * Uploads resume PDF, extracts text, uses AI to extract structured JSON,
 * saves Cloudinary URL, and syncs all parsed details directly to user profile.
 */
const uploadAndParseResumeHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume file provided. Please upload a PDF file.",
      });
    }

    if (
      req.file.mimetype !== "application/pdf" &&
      !req.file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for resume upload.",
      });
    }

    const userId = req.user._id;

    // 1. Upload to Cloudinary
    let resumeUrl = "";
    let publicId = "";
    try {
      const uploadResult = await uploadResumeToCloudinary(
        req.file.buffer,
        req.file.originalname,
        userId.toString()
      );
      resumeUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    } catch (uploadErr) {
      console.warn("Cloudinary upload issue:", uploadErr.message);
    }

    const resumeName = req.file.originalname;

    // 2. Save resume info on User document and role-specific profile collection immediately
    const user = await User.findById(userId);
    if (user && resumeUrl) {
      user.resumeUrl = resumeUrl;
      user.resumeName = resumeName;
      await user.save();
    }

    if (resumeUrl) {
      const resumeData = {
        resumeUrl,
        resumeName,
        uploadedAt: new Date(),
        isGenerated: false,
      };
      const userType = (user?.userType || req.user?.userType || "student").toLowerCase();
      try {
        if (userType.includes("fresh")) {
          await FresherProfile.findOneAndUpdate(
            { userId },
            { $set: { resume: resumeData } },
            { new: true, upsert: true }
          );
        } else if (userType.includes("prof") || userType.includes("work")) {
          await ProfessionalProfile.findOneAndUpdate(
            { userId },
            { $set: { resume: resumeData } },
            { new: true, upsert: true }
          );
        } else {
          await StudentProfile.findOneAndUpdate(
            { userId },
            { $set: { resume: resumeData } },
            { new: true, upsert: true }
          );
        }
      } catch (profileResumeErr) {
        console.warn("Could not immediately update profile.resume:", profileResumeErr.message);
      }
    }

    // 3. Extract text from PDF buffer
    const extractedText = await extractTextFromPdfBuffer(req.file.buffer);

    // 4. Use AI to parse resume text into structured JSON
    let parsedData = null;
    if (extractedText && extractedText.trim()) {
      parsedData = await parseResumeTextWithAi(extractedText, user);
    }

    // Fallback if AI parse fails: construct minimum structured JSON from user data
    if (!parsedData) {
      parsedData = {
        personal: {
          fullName: user?.fullName || "",
          email: user?.email || "",
          phone: user?.phone || "",
          location: user?.city || "",
          linkedin: user?.socialLinks?.linkedin || "",
          github: user?.socialLinks?.github || "",
          portfolio: "",
        },
        summary: "",
        education: [
          {
            college: user?.college || "",
            degree: user?.course || "",
            branch: user?.stream || "",
            startYear: user?.startYear ? String(user.startYear) : "",
            endYear: user?.endYear ? String(user.endYear) : "",
            cgpa: "",
          },
        ],
        skills: {
          programmingLanguages: user?.interests || [],
          frameworks: [],
          tools: [],
          other: [],
        },
        experience: [],
        projects: [],
        certifications: [],
        achievements: [],
      };
    }

    // Ensure personal details don't get erased if empty in resume
    if (!parsedData.personal) parsedData.personal = {};
    if (!parsedData.personal.fullName) parsedData.personal.fullName = user?.fullName || "";
    if (!parsedData.personal.email) parsedData.personal.email = user?.email || "";
    if (!parsedData.personal.phone) parsedData.personal.phone = user?.phone || "";

    // 5. Automatically sync all parsed resume details directly to User Profile
    if (user) {
      try {
        await syncProfileFromResume(user, parsedData, resumeUrl, resumeName);
      } catch (syncErr) {
        console.error("Error syncing profile from parsed resume:", syncErr.message);
      }
    }

    // 6. Save in Resume collection as primary resume
    try {
      await Resume.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          title: `${user?.fullName || "My"} Resume`,
          selectedTemplate: "professional",
          rawData: parsedData,
          resumeUrl,
          isPrimary: true,
        },
        { upsert: true, new: true }
      );
    } catch (resumeDbErr) {
      console.warn("Resume document save warning:", resumeDbErr.message);
    }

    const updatedUser = await User.findById(userId);
    let userPayloadFn = null;
    try {
      userPayloadFn = require("./authController").userPayload;
    } catch (e) {
      console.warn("Could not import userPayload:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: "Resume uploaded, parsed by AI, and profile saved successfully!",
      resumeUrl,
      resumeName,
      publicId,
      parsedData,
      user: userPayloadFn ? userPayloadFn(updatedUser) : updatedUser,
    });
  } catch (error) {
    console.error("uploadAndParseResumeHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload and parse resume",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/parse
 * Uploads resume PDF, extracts text, parses structured data with AI,
 * uploads PDF to Cloudinary, and returns parsed JSON for user review.
 */
const parseResumeHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume PDF file",
      });
    }

    if (
      req.file.mimetype !== "application/pdf" &&
      !req.file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are supported for resume parsing",
      });
    }

    // 1. Extract text from PDF buffer
    let extractedText = "";
    try {
      extractedText = await extractTextFromPdfBuffer(req.file.buffer);
    } catch (parseErr) {
      console.warn("PDF extraction warning:", parseErr.message);
    }

    // 2. Parse structured data from extracted text using AI / heuristic parser
    let parsedData = null;
    if (extractedText && extractedText.trim()) {
      parsedData = await parseResumeTextWithAi(extractedText, req.user);
    }
    if (!parsedData) {
      parsedData = await parseResumeText(extractedText);
    }

    // If fullName is fallback "Candidate Name" and we have user info or filename, use better candidate name
    if ((!parsedData.personal?.fullName || parsedData.personal.fullName === "Candidate Name") && req.user?.fullName) {
      if (!parsedData.personal) parsedData.personal = {};
      parsedData.personal.fullName = req.user.fullName;
    }
    if ((!parsedData.personal?.email || !parsedData.personal.email.trim()) && req.user?.email) {
      if (!parsedData.personal) parsedData.personal = {};
      parsedData.personal.email = req.user.email;
    }
    if ((!parsedData.personal?.phone || !parsedData.personal.phone.trim()) && req.user?.phone) {
      if (!parsedData.personal) parsedData.personal = {};
      parsedData.personal.phone = req.user.phone;
    }

    // 3. Upload original file to Cloudinary if authenticated
    let resumeUrl = "";
    let resumeName = req.file.originalname;

    if (req.user?._id) {
      try {
        const uploadResult = await uploadResumeToCloudinary(
          req.file.buffer,
          req.file.originalname,
          req.user._id.toString()
        );
        if (uploadResult?.secure_url) {
          resumeUrl = uploadResult.secure_url;
        }
      } catch (uploadErr) {
        console.warn("Cloudinary upload during parse warning:", uploadErr.message);
      }
    }

    // 4. Fetch existing profile data for immediate diff comparison in the frontend review modal
    let existingProfile = null;
    if (req.user?._id) {
      try {
        const user = await User.findById(req.user._id).lean();
        if (user) {
          const userType = user.userType;
          let profileDoc = null;
          if (userType === "student") {
            profileDoc = await StudentProfile.findOne({ userId: user._id }).lean();
          } else if (userType === "fresher") {
            profileDoc = await FresherProfile.findOne({ userId: user._id }).lean();
          } else if (userType === "professional") {
            profileDoc = await ProfessionalProfile.findOne({ userId: user._id }).lean();
          }

          let locationStr = "";
          if (profileDoc?.location) {
            const { city, state, country } = profileDoc.location;
            locationStr = [city, state, country].filter(Boolean).join(", ");
          }

          existingProfile = {
            personal: {
              fullName: user.fullName || "",
              email: user.email || "",
              phone: user.phone || "",
              location: locationStr,
              linkedin: profileDoc?.socialLinks?.linkedin || user.socialLinks?.linkedin || "",
              github: profileDoc?.socialLinks?.github || user.socialLinks?.github || "",
              portfolio: profileDoc?.socialLinks?.portfolio || user.socialLinks?.portfolio || "",
            },
            summary: profileDoc?.bio || profileDoc?.careerObjective || profileDoc?.professionalSummary || "",
            education: (profileDoc?.education || []).map((e) => ({
              college: e.institution || e.college || "",
              degree: e.degree || "",
              branch: e.fieldOfStudy || e.specialization || "",
              cgpa: e.grade || e.percentageOrCgpa || "",
              startYear: e.startYear ? String(e.startYear) : "",
              endYear: e.endYear ? String(e.endYear) : e.graduationYear ? String(e.graduationYear) : "",
            })),
            skills: {
              programmingLanguages: userType === "student"
                ? (profileDoc?.technicalSkills || []).join(", ")
                : (profileDoc?.skills?.programmingLanguages || []).map((s) => typeof s === "string" ? s : s.name || "").filter(Boolean).join(", "),
              frameworks: userType === "student" ? "" : (profileDoc?.skills?.frameworks || []).map((s) => typeof s === "string" ? s : s.name || "").filter(Boolean).join(", "),
              tools: userType === "student" ? "" : (profileDoc?.skills?.tools || []).map((s) => typeof s === "string" ? s : s.name || "").filter(Boolean).join(", "),
              other: userType === "student"
                ? (profileDoc?.softSkills || []).join(", ")
                : [
                    ...(profileDoc?.skills?.databases || []),
                    ...(profileDoc?.skills?.softSkills || []),
                    ...(profileDoc?.skills?.technical || []),
                  ].map((s) => typeof s === "string" ? s : s.name || "").filter(Boolean).join(", "),
            },
            projects: (profileDoc?.projects || []).map((p) => ({
              name: p.title || p.name || "",
              technologies: Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies || "",
              description: p.description || "",
              github: p.githubUrl || "",
              live: p.liveUrl || "",
            })),
            experience: (
              userType === "fresher"
                ? profileDoc?.internships || []
                : userType === "professional"
                ? profileDoc?.workExperience || []
                : profileDoc?.experience || []
            ).map((exp) => ({
              company: exp.companyName || exp.organization || "",
              role: exp.role || exp.jobTitle || "",
              duration: exp.startDate ? `${new Date(exp.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}${exp.endDate ? ` – ${new Date(exp.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}` : "",
              description: exp.description || "",
            })),
            certifications: (profileDoc?.certifications || []).map((c) => ({
              name: c.name || "",
              issuer: c.issuingOrganization || "",
              year: c.issueDate ? String(new Date(c.issueDate).getFullYear()) : "",
            })),
            achievements: (profileDoc?.achievements || []).map((a) => ({
              title: a.title || "",
              description: a.description || "",
            })),
            codingProfiles: {
              leetcode: profileDoc?.codingProfiles?.find?.((c) => c.platform?.toLowerCase() === "leetcode")?.profileUrl || "",
              hackerrank: profileDoc?.codingProfiles?.find?.((c) => c.platform?.toLowerCase() === "hackerrank")?.profileUrl || "",
              codechef: profileDoc?.codingProfiles?.find?.((c) => c.platform?.toLowerCase() === "codechef")?.profileUrl || "",
              codeforces: profileDoc?.codingProfiles?.find?.((c) => c.platform?.toLowerCase() === "codeforces")?.profileUrl || "",
              github: profileDoc?.codingProfiles?.find?.((c) => c.platform?.toLowerCase() === "github")?.profileUrl || profileDoc?.socialLinks?.github || "",
            },
          };
        }
      } catch (profErr) {
        console.warn("Failed to fetch existing profile during parse:", profErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Resume parsed successfully. Please review your imported details.",
      parsedData,
      existingProfile,
      resumeUrl,
      resumeName,
    });
  } catch (error) {
    console.error("parseResumeHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to parse resume",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/confirm-parsed
 * Merges user-verified parsed data into their existing profile without destroying existing data.
 */
const confirmParsedProfileHandler = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { parsedData, resumeUrl, resumeName } = req.body;
    if (!parsedData) {
      return res.status(400).json({
        success: false,
        message: "parsedData is required to confirm profile update",
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userType = user.userType;
    const ProfileModel = {
      student: StudentProfile,
      fresher: FresherProfile,
      professional: ProfessionalProfile,
    }[userType];

    let profile = ProfileModel ? await ProfileModel.findOne({ userId }) : null;

    // 1. Intelligent merge of personal / contact info into User
    const userUpdates = {};
    if (parsedData.personal?.fullName?.trim() && (!user.fullName || user.fullName === "User")) {
      userUpdates.fullName = parsedData.personal.fullName.trim();
    }
    if (parsedData.personal?.phone?.trim() && !user.phone) {
      userUpdates.phone = parsedData.personal.phone.trim();
    }
    if (resumeUrl) {
      userUpdates.resumeUrl = resumeUrl;
      userUpdates.resumeName = resumeName || user.resumeName || "Uploaded Resume.pdf";
    }

    const mergedSocialLinks = {
      linkedin: parsedData.personal?.linkedin || user.socialLinks?.linkedin || "",
      github: parsedData.personal?.github || user.socialLinks?.github || "",
      portfolio: parsedData.personal?.portfolio || user.socialLinks?.portfolio || "",
    };
    userUpdates.socialLinks = mergedSocialLinks;

    await User.findByIdAndUpdate(userId, userUpdates);

    // 2. Intelligent merge into Profile model
    if (profile) {
      // Social links
      profile.socialLinks = {
        ...profile.socialLinks?.toObject?.(),
        ...mergedSocialLinks,
      };

      // Location
      if (parsedData.personal?.location?.trim()) {
        const locParts = parsedData.personal.location.split(",").map((p) => p.trim());
        profile.location = {
          ...profile.location?.toObject?.(),
          city: locParts[0] || profile.location?.city || "",
          state: locParts[1] || profile.location?.state || "",
          country: locParts[2] || profile.location?.country || "India",
        };
      }

      // Resume file pointer
      if (resumeUrl) {
        profile.resume = {
          resumeUrl,
          resumeName: resumeName || "Uploaded Resume.pdf",
          uploadedAt: new Date(),
        };
      }

      // Education: append non-duplicate education entries
      const existingEdu = profile.education || [];
      const newEduItems = (parsedData.education || []).filter((item) => item.college || item.degree);

      for (const ne of newEduItems) {
        const matchIndex = existingEdu.findIndex(
          (ee) =>
            (ee.institution || "").toLowerCase() === (ne.college || "").toLowerCase() &&
            (ee.degree || "").toLowerCase() === (ne.degree || "").toLowerCase()
        );

        if (matchIndex === -1) {
          existingEdu.push({
            institution: ne.college?.trim() || "University / College",
            degree: ne.degree?.trim() || "Degree / Coursework",
            fieldOfStudy: ne.branch?.trim() || "",
            specialization: ne.branch?.trim() || "",
            grade: ne.cgpa?.trim() || "",
            percentageOrCgpa: ne.cgpa?.trim() || "",
            startYear: Number(ne.startYear) || undefined,
            endYear: Number(ne.endYear) || undefined,
            graduationYear: Number(ne.endYear) || undefined,
          });
        } else {
          // Fill in missing fields
          if (!existingEdu[matchIndex].grade && ne.cgpa) {
            existingEdu[matchIndex].grade = ne.cgpa.trim();
            existingEdu[matchIndex].percentageOrCgpa = ne.cgpa.trim();
          }
          if (!existingEdu[matchIndex].endYear && ne.endYear) {
            existingEdu[matchIndex].endYear = Number(ne.endYear) || undefined;
            existingEdu[matchIndex].graduationYear = Number(ne.endYear) || undefined;
          }
        }
      }
      profile.education = existingEdu;

      // Projects: append non-duplicate projects
      const existingProjects = profile.projects || [];
      const newProjects = (parsedData.projects || []).filter((p) => p.name || p.title);

      for (const np of newProjects) {
        const title = (np.name || np.title || "").trim();
        const exists = existingProjects.some(
          (ep) => (ep.title || ep.name || "").toLowerCase() === title.toLowerCase()
        );
        if (!exists) {
          const rawDesc = Array.isArray(np.description) ? np.description.join(" ") : np.description || "";
          existingProjects.push({
            title,
            name: title,
            description: rawDesc.trim() || "Project details",
            technologies: splitSkills(np.technologies),
            githubUrl: np.github?.trim() || "",
            liveUrl: np.live?.trim() || "",
          });
        }
      }
      profile.projects = existingProjects;

      // Experience & Internships: append non-duplicate entries
      const newExpItems = [
        ...(parsedData.experience || []),
        ...(parsedData.internships || []),
      ].filter((e) => e.company || e.role);

      if (userType === "student") {
        const existingExp = profile.experience || [];
        for (const ne of newExpItems) {
          const comp = (ne.company || "").trim();
          const exists = existingExp.some(
            (ee) => (ee.organization || "").toLowerCase() === comp.toLowerCase()
          );
          if (!exists) {
            const rawDesc = Array.isArray(ne.description) ? ne.description.join(" ") : ne.description || "";
            existingExp.push({
              organization: comp || "Organization",
              role: ne.role?.trim() || "Intern",
              description: rawDesc.trim() || "Experience details",
              startDate: parseResumeDate(ne.duration),
            });
          }
        }
        profile.experience = existingExp;
      } else if (userType === "fresher") {
        const existingInternships = profile.internships || [];
        for (const ne of newExpItems) {
          const comp = (ne.company || "").trim();
          const exists = existingInternships.some(
            (ei) => (ei.companyName || "").toLowerCase() === comp.toLowerCase()
          );
          if (!exists) {
            existingInternships.push({
              companyName: comp,
              role: ne.role?.trim() || "Intern",
              description: Array.isArray(ne.description) ? ne.description.join(" ") : ne.description || "",
              startDate: parseResumeDate(ne.duration),
            });
          }
        }
        profile.internships = existingInternships;
      } else if (userType === "professional") {
        const existingWork = profile.workExperience || [];
        for (const ne of newExpItems) {
          const comp = (ne.company || "").trim();
          const exists = existingWork.some(
            (ew) => (ew.companyName || "").toLowerCase() === comp.toLowerCase()
          );
          if (!exists) {
            existingWork.push({
              companyName: comp,
              jobTitle: ne.role?.trim() || "Software Engineer",
              description: Array.isArray(ne.description) ? ne.description.join(" ") : ne.description || "",
              startDate: parseResumeDate(ne.duration),
            });
          }
        }
        profile.workExperience = existingWork;
      }

      // Skills: merge without overwriting or deleting
      const incomingSkills = [
        ...splitSkills(parsedData.skills?.programmingLanguages),
        ...splitSkills(parsedData.skills?.frameworks),
        ...splitSkills(parsedData.skills?.tools),
        ...splitSkills(parsedData.skills?.other),
      ];

      if (userType === "student") {
        profile.technicalSkills = mergeSkillStrings(
          profile.technicalSkills || [],
          [
            ...splitSkills(parsedData.skills?.programmingLanguages),
            ...splitSkills(parsedData.skills?.frameworks),
            ...splitSkills(parsedData.skills?.tools),
          ]
        );
        profile.softSkills = mergeSkillStrings(
          profile.softSkills || [],
          splitSkills(parsedData.skills?.other)
        );
      } else {
        const currentSkills = profile.skills || {};
        profile.skills = {
          ...currentSkills.toObject?.(),
          programmingLanguages: mergeSkillStrings(
            currentSkills.programmingLanguages || [],
            splitSkills(parsedData.skills?.programmingLanguages)
          ),
          frameworks: mergeSkillStrings(
            currentSkills.frameworks || [],
            splitSkills(parsedData.skills?.frameworks)
          ),
          tools: mergeSkillStrings(
            currentSkills.tools || [],
            splitSkills(parsedData.skills?.tools)
          ),
        };
      }

      // Certifications
      const existingCerts = profile.certifications || [];
      for (const nc of parsedData.certifications || []) {
        if (!nc.name) continue;
        const exists = existingCerts.some(
          (ec) => (ec.name || "").toLowerCase() === nc.name.trim().toLowerCase()
        );
        if (!exists) {
          existingCerts.push({
            name: nc.name.trim(),
            issuingOrganization: nc.issuer?.trim() || "Independent / Online",
            issueDate: nc.year ? new Date(`${nc.year}-01-01`) : undefined,
          });
        }
      }
      profile.certifications = existingCerts;

      // Achievements
      const existingAch = profile.achievements || [];
      for (const na of parsedData.achievements || []) {
        if (!na.title) continue;
        const exists = existingAch.some(
          (ea) => (ea.title || "").toLowerCase() === na.title.trim().toLowerCase()
        );
        if (!exists) {
          existingAch.push({
            title: na.title.trim(),
            description: na.description?.trim() || "",
          });
        }
      }
      profile.achievements = existingAch;

      // Summary / Bio / Objective
      if (parsedData.summary?.trim()) {
        const trimmedSummary = parsedData.summary.trim().slice(0, 1500);
        if (userType === "student") {
          profile.bio = trimmedSummary;
        } else if (userType === "fresher") {
          profile.careerObjective = trimmedSummary;
          if (!profile.bio) profile.bio = trimmedSummary;
        } else if (userType === "professional") {
          profile.professionalSummary = trimmedSummary;
        }
      }

      // Coding Profiles (FresherProfile & StudentProfile social links)
      if (parsedData.codingProfiles && typeof parsedData.codingProfiles === "object") {
        if (userType === "fresher") {
          const currentCoding = profile.codingProfiles || [];
          const platforms = [
            { key: "leetcode", label: "LeetCode" },
            { key: "hackerrank", label: "HackerRank" },
            { key: "codechef", label: "CodeChef" },
            { key: "codeforces", label: "Codeforces" },
            { key: "github", label: "GitHub" },
          ];
          for (const p of platforms) {
            const url = parsedData.codingProfiles[p.key]?.trim();
            if (url) {
              const idx = currentCoding.findIndex((cp) => cp.platform?.toLowerCase() === p.label.toLowerCase());
              if (idx === -1) {
                currentCoding.push({
                  platform: p.label,
                  profileUrl: url,
                  username: url.split("/").filter(Boolean).pop() || "",
                });
              } else if (!currentCoding[idx].profileUrl) {
                currentCoding[idx].profileUrl = url;
              }
            }
          }
          profile.codingProfiles = currentCoding;
        }
      }

      // Recalculate profile completion
      let compScore = 0;
      if (user.fullName && user.email && user.phone) compScore += 20;
      if (profile.education?.length) compScore += 20;
      const totalSkillsCount = userType === "student"
        ? (profile.technicalSkills?.length || 0) + (profile.softSkills?.length || 0)
        : (profile.skills?.programmingLanguages?.length || 0) + (profile.skills?.frameworks?.length || 0);
      if (totalSkillsCount >= 3) compScore += 20;
      else if (totalSkillsCount > 0) compScore += 10;
      if (profile.projects?.length) compScore += 20;
      if (profile.resume?.resumeUrl) compScore += 10;
      if (profile.certifications?.length) compScore += 10;

      profile.profileCompletion = Math.min(100, compScore);
      profile.isProfileComplete = profile.profileCompletion >= 70;

      await profile.save({ validateBeforeSave: false });
    }

    // 3. Create or update user's base Resume document with the confirmed data
    const rawData = {
      personal: {
        fullName: parsedData.personal?.fullName || user.fullName || "",
        email: parsedData.personal?.email || user.email || "",
        phone: parsedData.personal?.phone || user.phone || "",
        location: parsedData.personal?.location || "",
        linkedin: mergedSocialLinks.linkedin,
        github: mergedSocialLinks.github,
        portfolio: mergedSocialLinks.portfolio,
      },
      education: (parsedData.education || []).map((e) => ({
        id: crypto.randomUUID(),
        college: e.college || "",
        degree: e.degree || "",
        branch: e.branch || "",
        cgpa: e.cgpa || "",
        startYear: e.startYear || "",
        endYear: e.endYear || "",
      })),
      skills: {
        programmingLanguages: Array.isArray(parsedData.skills?.programmingLanguages)
          ? parsedData.skills.programmingLanguages.join(", ")
          : parsedData.skills?.programmingLanguages || "",
        frameworks: Array.isArray(parsedData.skills?.frameworks)
          ? parsedData.skills.frameworks.join(", ")
          : parsedData.skills?.frameworks || "",
        tools: Array.isArray(parsedData.skills?.tools)
          ? parsedData.skills.tools.join(", ")
          : parsedData.skills?.tools || "",
        other: Array.isArray(parsedData.skills?.other)
          ? parsedData.skills.other.join(", ")
          : parsedData.skills?.other || "",
      },
      projects: (parsedData.projects || []).map((p) => ({
        id: crypto.randomUUID(),
        name: p.name || "",
        technologies: Array.isArray(p.technologies) ? p.technologies.join(", ") : p.technologies || "",
        description: Array.isArray(p.description) ? p.description.join("\n") : p.description || "",
        github: p.github || "",
        live: p.live || "",
      })),
      experience: (parsedData.experience || []).map((e) => ({
        id: crypto.randomUUID(),
        company: e.company || "",
        role: e.role || "",
        duration: e.duration || "",
        description: Array.isArray(e.description) ? e.description.join("\n") : e.description || "",
      })),
      certifications: (parsedData.certifications || []).map((c) => ({
        id: crypto.randomUUID(),
        name: c.name || "",
        issuer: c.issuer || "",
        year: c.year || "",
      })),
      achievements: (parsedData.achievements || []).map((a) => ({
        id: crypto.randomUUID(),
        title: a.title || "",
        description: a.description || "",
      })),
    };

    let generatedData = null;
    try {
      generatedData = await generateResume(rawData, "classic");
    } catch (genErr) {
      console.warn("Base resume generation warning:", genErr.message);
    }

    const existingResume = await Resume.findOne({ user: userId, isPrimary: true });
    let resumeRecord = null;

    if (existingResume) {
      existingResume.rawData = rawData;
      if (generatedData) existingResume.generatedData = generatedData;
      if (resumeUrl) existingResume.resumeUrl = resumeUrl;
      resumeRecord = await existingResume.save();
    } else {
      resumeRecord = await Resume.create({
        user: userId,
        title: `${rawData.personal.fullName || "Primary"} Resume`,
        rawData,
        generatedData: generatedData || {},
        selectedTemplate: "classic",
        isPrimary: true,
        resumeUrl: resumeUrl || "",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parsed resume details successfully imported and merged into profile!",
      profile,
      resume: resumeRecord,
    });
  } catch (error) {
    console.error("confirmParsedProfileHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm and save parsed details to profile",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/tailor
 * Generates a Job- or Internship-specific tailored resume based exclusively
 * on verified user profile/resume data (never invents skills or facts).
 * Renders PDF and uploads to Cloudinary. Saves tailored resume without modifying primary profile.
 */
const tailorResumeHandler = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { opportunityType, opportunityId, opportunityData, template } = req.body;

    let targetOpportunity = { ...(opportunityData || {}) };

    if (opportunityId) {
      if (opportunityType === "Job" || opportunityType === "job") {
        const job = await Job.findById(opportunityId).lean();
        if (job) {
          targetOpportunity = {
            ...targetOpportunity,
            title: job.title || targetOpportunity.title,
            companyName: job.companyName || targetOpportunity.companyName || "",
            description: job.description || targetOpportunity.description || "",
            requiredSkills: job.requiredSkills?.length ? job.requiredSkills : (targetOpportunity.requiredSkills || []),
            preferredSkills: job.preferredSkills?.length ? job.preferredSkills : (targetOpportunity.preferredSkills || []),
            bonusSkills: job.bonusSkills || targetOpportunity.bonusSkills || [],
            responsibilities: job.responsibilities?.length ? job.responsibilities : (targetOpportunity.responsibilities || []),
            education: job.education || targetOpportunity.education || "",
            experience: job.experience ? `${job.experience.minYears || 0}-${job.experience.maxYears || 0} years (${job.experience.level || ""})` : targetOpportunity.experience || "",
            workMode: job.workMode || targetOpportunity.workMode || "",
            location: job.location || targetOpportunity.location || "",
          };
        }
      } else if (opportunityType === "Internship" || opportunityType === "internship") {
        const internship = await Internship.findById(opportunityId).lean();
        if (internship) {
          targetOpportunity = {
            ...targetOpportunity,
            title: internship.title || targetOpportunity.title,
            companyName: internship.companyName || targetOpportunity.companyName || "",
            description: internship.description || targetOpportunity.description || "",
            requiredSkills: internship.requiredSkills?.length ? internship.requiredSkills : (targetOpportunity.requiredSkills || []),
            preferredSkills: internship.preferredSkills?.length ? internship.preferredSkills : (targetOpportunity.preferredSkills || []),
            responsibilities: internship.responsibilities?.length ? internship.responsibilities : (targetOpportunity.responsibilities || []),
            education: internship.education || targetOpportunity.education || "",
            workMode: internship.workMode || targetOpportunity.workMode || "",
            location: internship.location || targetOpportunity.location || "",
          };
        }
      }
    }

    // Normalize requiredSkills from any alias
    if (!targetOpportunity.requiredSkills || targetOpportunity.requiredSkills.length === 0) {
      targetOpportunity.requiredSkills = targetOpportunity.skillsRequired || targetOpportunity.skills || targetOpportunity.tags || [];
    }

    if (!targetOpportunity.title) {
      return res.status(400).json({
        success: false,
        message: "Opportunity details (title, skills, description) are required to tailor resume",
      });
    }

    // Check if an existing tailored resume already exists for this opportunity (reuse if not forceRegenerate)
    const forceRegenerate = req.body.forceRegenerate === true;
    if (!forceRegenerate && opportunityId) {
      const isJob = (opportunityType || "").toLowerCase() === "job";
      const existingTailored = await Resume.findOne({
        user: req.user._id,
        isTailored: true,
        [isJob ? "targetJobId" : "targetInternshipId"]: opportunityId,
      }).lean();

      if (existingTailored && existingTailored.generatedData) {
        return res.status(200).json({
          success: true,
          reused: true,
          message: `Existing tailored resume retrieved for ${targetOpportunity.title}`,
          resume: existingTailored,
          resumeUrl: existingTailored.resumeUrl,
          generatedData: existingTailored.generatedData,
          tailoredMeta: existingTailored.generatedData.tailoredMeta || {},
        });
      }
    }

    // 1. Fetch user's verified data from primary Resume or Profile
    const primaryResume = await Resume.findOne({
      user: req.user._id,
      isPrimary: true,
    }).lean();

    const latestResume = !primaryResume
      ? await Resume.findOne({ user: req.user._id, isTailored: { $ne: true } })
          .sort({ updatedAt: -1 })
          .lean()
      : null;

    let userData = primaryResume?.rawData || latestResume?.rawData;

    if (!userData) {
      // Load from profile using getProfileForResume mapping logic
      const user = await User.findById(req.user._id).lean();
      let roleProfile = null;
      if (user.userType === "student") {
        roleProfile = await StudentProfile.findOne({ userId: req.user._id }).lean();
      } else if (user.userType === "fresher") {
        roleProfile = await FresherProfile.findOne({ userId: req.user._id }).lean();
      } else {
        roleProfile = await ProfessionalProfile.findOne({ userId: req.user._id }).lean();
      }

      userData = {
        personal: {
          fullName: user.fullName || "Candidate",
          email: user.email || "",
          phone: user.phone || "",
          location: roleProfile?.location ? `${roleProfile.location.city || ""}, ${roleProfile.location.country || ""}` : "",
          linkedin: roleProfile?.socialLinks?.linkedin || user.socialLinks?.linkedin || "",
          github: roleProfile?.socialLinks?.github || user.socialLinks?.github || "",
          portfolio: roleProfile?.socialLinks?.portfolio || user.socialLinks?.portfolio || "",
        },
        education: (roleProfile?.education || []).map((edu) => ({
          college: edu.institution || "",
          degree: edu.degree || "",
          branch: edu.fieldOfStudy || edu.specialization || "",
          cgpa: edu.percentageOrCgpa || edu.grade || "",
          startYear: String(edu.startYear || ""),
          endYear: String(edu.endYear || edu.graduationYear || ""),
        })),
        skills: {
          programmingLanguages: user.userType === "student"
            ? (roleProfile?.technicalSkills || []).join(", ")
            : skillsToString(roleProfile?.skills?.programmingLanguages || []),
          frameworks: skillsToString(roleProfile?.skills?.frameworks || []),
          tools: skillsToString(roleProfile?.skills?.tools || []),
          other: user.userType === "student"
            ? (roleProfile?.softSkills || []).join(", ")
            : skillsToString(roleProfile?.skills?.databases || []),
        },
        projects: (roleProfile?.projects || []).map((p) => ({
          name: p.title || p.name || "",
          technologies: (p.technologies || []).join(", "),
          description: p.description || "",
          github: p.githubUrl || "",
          live: p.liveUrl || "",
        })),
        experience: (roleProfile?.workExperience || roleProfile?.internships || roleProfile?.experience || []).map((e) => ({
          company: e.companyName || e.organization || "",
          role: e.jobTitle || e.role || "",
          duration: formatDate(e.startDate) + (e.endDate ? ` – ${formatDate(e.endDate)}` : ""),
          description: e.description || "",
        })),
        certifications: (roleProfile?.certifications || []).map((c) => ({
          name: c.name || "",
          issuer: c.issuingOrganization || "",
          year: c.issueDate ? String(new Date(c.issueDate).getFullYear()) : "",
        })),
        achievements: (roleProfile?.achievements || []).map((a) => ({
          title: a.title || "",
          description: a.description || "",
        })),
      };
    }

    // 2. Call tailored resume generator with strict NO-INVENTION rules
    const selectedTemplate = template || primaryResume?.selectedTemplate || "classic";
    const tailoredGeneratedData = await tailorResumeForOpportunity(
      userData,
      targetOpportunity,
      selectedTemplate
    );

    const oppCleanName = (targetOpportunity.title || "Role").replace(/[^a-zA-Z0-9_-]/g, "_");
    const resumeTitle = `Tailored - ${targetOpportunity.title} (${targetOpportunity.companyName || "Opportunity"})`;

    // 3. Compile PDF buffer and upload to Cloudinary
    let cloudinaryUrl = "";
    try {
      const pdfBuffer = await generateResumePdfBuffer(
        tailoredGeneratedData,
        selectedTemplate,
        resumeTitle
      );
      const cleanFileName = `${userData.personal?.fullName?.replace(/[^a-zA-Z0-9_-]/g, "_") || "Candidate"}_${oppCleanName}.pdf`;
      const uploadResult = await uploadResumeToCloudinary(
        pdfBuffer,
        cleanFileName,
        req.user._id.toString()
      );
      if (uploadResult?.secure_url) {
        cloudinaryUrl = uploadResult.secure_url;
      }
    } catch (uploadErr) {
      console.warn("Cloudinary upload of tailored resume warning:", uploadErr.message);
    }

    // 4. Save tailored resume to DB as separate record (isPrimary: false, isTailored: true)
    let query = {
      user: req.user._id,
      isTailored: true,
    };
    if (opportunityId) {
      if (opportunityType === "Job" || opportunityType === "job") {
        query.targetJobId = opportunityId;
      } else {
        query.targetInternshipId = opportunityId;
      }
    } else {
      query.targetOpportunityTitle = targetOpportunity.title;
    }

    let tailoredRecord = await Resume.findOne(query);

    if (tailoredRecord) {
      tailoredRecord.title = resumeTitle;
      tailoredRecord.rawData = userData;
      tailoredRecord.generatedData = tailoredGeneratedData;
      tailoredRecord.selectedTemplate = selectedTemplate;
      if (cloudinaryUrl) tailoredRecord.resumeUrl = cloudinaryUrl;
      await tailoredRecord.save();
    } else {
      tailoredRecord = await Resume.create({
        user: req.user._id,
        title: resumeTitle,
        rawData: userData,
        generatedData: tailoredGeneratedData,
        selectedTemplate,
        isPrimary: false,
        isTailored: true,
        targetJobId: (opportunityType === "Job" || opportunityType === "job") ? opportunityId : null,
        targetInternshipId: (opportunityType === "Internship" || opportunityType === "internship") ? opportunityId : null,
        opportunityType: (opportunityType === "Job" || opportunityType === "job") ? "Job" : "Internship",
        targetOpportunityTitle: targetOpportunity.title,
        resumeUrl: cloudinaryUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Tailored resume generated for ${targetOpportunity.title}`,
      resume: tailoredRecord,
      resumeUrl: tailoredRecord.resumeUrl,
      generatedData: tailoredGeneratedData,
      tailoredMeta: tailoredGeneratedData.tailoredMeta || {},
    });
  } catch (error) {
    console.error("tailorResumeHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate tailored resume",
      error: error.message,
    });
  }
};

/**
 * GET /api/resume/tailored/:opportunityType/:id
 * Fetches an existing tailored resume for a specific job or internship if one exists.
 */
const getTailoredResumeHandler = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { opportunityType, id } = req.params;
    const isJob = opportunityType.toLowerCase() === "job";

    const query = {
      user: req.user._id,
      isTailored: true,
      [isJob ? "targetJobId" : "targetInternshipId"]: id,
    };

    const resume = await Resume.findOne(query).sort({ updatedAt: -1 });

    if (!resume) {
      return res.status(200).json({ success: true, exists: false, resume: null });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      resume,
    });
  } catch (error) {
    console.error("getTailoredResumeHandler error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateResumeHandler,
  updateResumeHandler,
  getMyResume,
  getAllResumes,
  saveFinalResume,
  getResumeById,
  setPrimaryResume,
  deleteResume,
  saveManualEdit,
  uploadResumeHandler,
  uploadAndParseResumeHandler,
  getProfileForResume,
  parseResumeHandler,
  confirmParsedProfileHandler,
  tailorResumeHandler,
  getTailoredResumeHandler,
};
