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

/**
 * GET /api/resume/me
 */
const getMyResume = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const resume = await Resume.findOne({ user: req.user._id });

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
 * PUT /api/resume/manual
 * Body: { generatedData }
 */
const saveManualEdit = async (req, res) => {
  try {
    const { generatedData } = req.body;

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

    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id },
      { generatedData },
      { new: true },
    );

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
  const ProfileModel = {
    student: StudentProfile,
    fresher: FresherProfile,
    professional: ProfessionalProfile,
  }[user.userType];
  if (!ProfileModel) return;

  const profile = await ProfileModel.findOne({ userId: user._id });
  if (!profile) return;

  const locationParts = String(rawData.personal.location || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  profile.location = {
    ...profile.location?.toObject?.(),
    city: locationParts[0] || "",
    state: locationParts[1] || "",
    country: locationParts.slice(2).join(", ") || "",
  };
  profile.socialLinks = {
    ...profile.socialLinks?.toObject?.(),
    linkedin: String(rawData.personal?.linkedin || "").trim(),
    github: String(rawData.personal?.github || "").trim(),
    portfolio: String(rawData.personal?.portfolio || "").trim(),
  };

  const education = (rawData.education || [])
    .filter((item) => item.college || item.degree)
    .map((item) => ({
      institution: item.college?.trim() || "",
      degree: item.degree?.trim() || "",
      specialization: item.branch?.trim() || "",
      fieldOfStudy: item.branch?.trim() || "",
      percentageOrCgpa: item.cgpa?.trim() || "",
      grade: item.cgpa?.trim() || "",
      graduationYear: Number(item.endYear) || undefined,
      endYear: Number(item.endYear) || undefined,
      startYear: Number(item.startYear) || undefined,
    }));
  const projects = (rawData.projects || [])
    .filter((item) => item.name || item.description)
    .map((item) => ({
      title: item.name?.trim() || undefined,
      name: item.name?.trim() || undefined,
      description: item.description?.trim() || "",
      technologies: splitSkills(item.technologies),
      githubUrl: item.github?.trim() || "",
      liveUrl: item.live?.trim() || "",
    }));
  const experience = (rawData.experience || [])
    .filter((item) => item.company || item.role || item.description)
    .map((item) => ({
      organization: item.company?.trim() || undefined,
      companyName: item.company?.trim() || undefined,
      role: item.role?.trim() || undefined,
      jobTitle: item.role?.trim() || undefined,
      description: item.description?.trim() || "",
      startDate: parseResumeDate(item.duration),
    }));
  const certifications = (rawData.certifications || [])
    .filter((item) => item.name || item.issuer)
    .map((item) => ({
      name: item.name?.trim() || undefined,
      issuingOrganization: item.issuer?.trim() || "",
      issueDate: item.year ? new Date(`${item.year}-01-01`) : undefined,
    }));
  const achievements = (rawData.achievements || [])
    .filter((item) => item.title || item.description)
    .map((item) => ({
      title: item.title?.trim() || undefined,
      description: item.description?.trim() || "",
    }));

  if (user.userType === "student") {
    profile.education = education.map(
      ({ institution, degree, fieldOfStudy, grade, startYear, endYear }) => ({
        institution,
        degree,
        fieldOfStudy,
        grade,
        startYear,
        endYear,
      }),
    );
    profile.projects = projects.map(
      ({ title, description, technologies, githubUrl, liveUrl }) => ({
        title,
        description,
        technologies,
        githubUrl,
        liveUrl,
      }),
    );
    profile.experience = experience.map(
      ({ organization, role, description, startDate }) => ({
        organization,
        role,
        description,
        startDate,
      }),
    );
    profile.technicalSkills = splitSkills(rawData.skills.programmingLanguages);
    profile.softSkills = splitSkills(rawData.skills.other);
  } else if (user.userType === "fresher") {
    profile.education = education.map(
      ({
        degree,
        specialization,
        institution,
        percentageOrCgpa,
        graduationYear,
      }) => ({
        degree,
        specialization,
        institution,
        percentageOrCgpa,
        graduationYear,
      }),
    );
    profile.projects = projects.map(
      ({ title, description, technologies, githubUrl, liveUrl }) => ({
        title,
        description,
        technologies,
        githubUrl,
        liveUrl,
      }),
    );
    profile.internships = experience.map(
      ({ companyName, role, description, startDate }) => ({
        companyName,
        role,
        description,
        startDate,
      }),
    );
    profile.skills = {
      ...profile.skills?.toObject?.(),
      programmingLanguages: splitSkills(
        rawData.skills.programmingLanguages,
      ).map((name) => ({ name })),
      frameworks: splitSkills(rawData.skills.frameworks).map((name) => ({
        name,
      })),
      tools: splitSkills(rawData.skills.tools).map((name) => ({ name })),
    };
  } else {
    profile.education = education.map(
      ({
        degree,
        specialization,
        institution,
        percentageOrCgpa,
        graduationYear,
      }) => ({
        degree,
        specialization,
        institution,
        percentageOrCgpa,
        graduationYear,
      }),
    );
    profile.projects = projects.map(
      ({ name, description, technologies, githubUrl, liveUrl }) => ({
        name,
        description,
        technologies,
        githubUrl,
        liveUrl,
      }),
    );
    profile.workExperience = experience.map(
      ({ companyName, jobTitle, description, startDate }) => ({
        companyName,
        jobTitle,
        description,
        startDate,
      }),
    );
    profile.skills = {
      ...profile.skills?.toObject?.(),
      programmingLanguages: splitSkills(
        rawData.skills.programmingLanguages,
      ).map((name) => ({ name })),
      frameworks: splitSkills(rawData.skills.frameworks).map((name) => ({
        name,
      })),
      tools: splitSkills(rawData.skills.tools).map((name) => ({ name })),
    };
  }

  profile.certifications = certifications;
  profile.achievements = achievements;
  await profile.save({ validateBeforeSave: false });
  await User.findByIdAndUpdate(user._id, {
    $set: {
      fullName: String(rawData.personal?.fullName || user.fullName || "").trim(),
      phone: String(rawData.personal?.phone || user.phone || "").trim(),
      socialLinks: {
        linkedin: String(rawData.personal?.linkedin || "").trim(),
        github: String(rawData.personal?.github || "").trim(),
        portfolio: String(rawData.personal?.portfolio || "").trim(),
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

module.exports = {
  generateResumeHandler,
  updateResumeHandler,
  getMyResume,
  saveManualEdit,
  uploadResumeHandler,
  getProfileForResume,
};
