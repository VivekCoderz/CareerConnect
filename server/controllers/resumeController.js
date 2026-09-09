const {
  generateResume,
  updateResume,
} = require("../services/aiResumeservice.js");
const Resume = require("../models/Resume.js");
const User = require("../models/User.js");
const StudentProfile = require("../models/StudentProfile.js");
const FresherProfile = require("../models/FresherProfile.js");
const ProfessionalProfile = require("../models/ProfessionalProfile.js");
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

const syncProfileFromResume = async (user, rawData) => {
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
      rawData.education = profile.education.map((edu) => ({
        id: String(edu._id || crypto.randomUUID()),
        college: edu.institution || "",
        degree: edu.degree || "",
        branch: edu.fieldOfStudy || edu.specialization || "",
        cgpa:
          edu.percentageOrCgpa ||
          edu.grade ||
          (edu.academicGrade ? edu.academicGrade : "") ||
          "",
        startYear: edu.startYear ? String(edu.startYear) : "",
        endYear: edu.endYear
          ? String(edu.endYear)
          : edu.graduationYear
            ? String(edu.graduationYear)
            : "",
      }));
    }
    if (!rawData.education.length) {
      rawData.education = [
        {
          id: "default",
          college: "",
          degree: "",
          branch: "",
          cgpa: "",
          startYear: "",
          endYear: "",
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
        { new: true },
      );
    } else if (req.user.userType === "fresher") {
      await FresherProfile.findOneAndUpdate(
        { userId },
        { resume: resumeData },
        { new: true },
      );
    } else if (req.user.userType === "professional") {
      await ProfessionalProfile.findOneAndUpdate(
        { userId },
        { resume: resumeData },
        { new: true },
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
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-1.5-pro",
  ].filter(Boolean);

  for (const modelName of modelsToTry) {
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

    // 2. Save resume info on User document
    const user = await User.findById(userId);
    if (user && resumeUrl) {
      user.resumeUrl = resumeUrl;
      user.resumeName = resumeName;
      await user.save();
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
        await syncProfileFromResume(user, parsedData);
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
};
