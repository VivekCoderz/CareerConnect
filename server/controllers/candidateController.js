const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const { escapeRegex } = require("../utils/listingSecurity");
const mongoose = require("mongoose");

/**
 * Safely extracts an array of skill strings from any candidate profile document
 * (handles StudentProfile, FresherProfile, ProfessionalProfile structures)
 */
const extractProfileSkills = (prof) => {
  if (!prof) return [];
  const skillsSet = new Set();

  const addSkill = (val) => {
    if (!val) return;
    if (typeof val === "string") {
      val.split(",").forEach((s) => {
        const trimmed = s.trim();
        if (trimmed) skillsSet.add(trimmed);
      });
    } else if (typeof val === "object") {
      const name = val.name || val.title || val.skill;
      if (typeof name === "string" && name.trim()) {
        skillsSet.add(name.trim());
      }
    }
  };

  // StudentProfile: technicalSkills, softSkills
  if (Array.isArray(prof.technicalSkills)) {
    prof.technicalSkills.forEach(addSkill);
  }
  if (Array.isArray(prof.softSkills)) {
    prof.softSkills.forEach(addSkill);
  }

  // FresherProfile & ProfessionalProfile: skills is an object with category arrays
  // or in some formats, skills might be an array or string
  if (prof.skills) {
    if (Array.isArray(prof.skills)) {
      prof.skills.forEach(addSkill);
    } else if (typeof prof.skills === "object") {
      Object.values(prof.skills).forEach((categoryVal) => {
        if (Array.isArray(categoryVal)) {
          categoryVal.forEach(addSkill);
        } else if (typeof categoryVal === "string" || (categoryVal && typeof categoryVal === "object")) {
          addSkill(categoryVal);
        }
      });
    } else if (typeof prof.skills === "string") {
      addSkill(prof.skills);
    }
  }

  // Also check skillsUsed if present in projects
  if (Array.isArray(prof.skillsUsed)) {
    prof.skillsUsed.forEach(addSkill);
  }

  return Array.from(skillsSet);
};

/**
 * Modular match score calculation algorithm
 */
const calculateMatch = (candidateSkills = [], jobRequiredSkills = [], jobPreferredSkills = []) => {
  const normCandidate = (Array.isArray(candidateSkills) ? candidateSkills : [])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());
  const normRequired = (Array.isArray(jobRequiredSkills) ? jobRequiredSkills : [])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());
  const normPreferred = (Array.isArray(jobPreferredSkills) ? jobPreferredSkills : [])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  if (!normRequired.length && !normPreferred.length) {
    return {
      matchPercentage: 85,
      strongSkills: normCandidate.slice(0, 3),
      missingSkills: [],
    };
  }

  const strongSkills = [];
  const missingSkills = [];

  normRequired.forEach((reqSkill) => {
    if (normCandidate.some((cSkill) => cSkill.includes(reqSkill) || reqSkill.includes(cSkill))) {
      strongSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  });

  const reqScore = normRequired.length > 0 ? (strongSkills.length / normRequired.length) * 70 : 50;
  
  let prefMatches = 0;
  normPreferred.forEach((prefSkill) => {
    if (normCandidate.some((cSkill) => cSkill.includes(prefSkill) || prefSkill.includes(cSkill))) {
      prefMatches++;
      if (!strongSkills.includes(prefSkill)) strongSkills.push(prefSkill);
    }
  });

  const prefScore = normPreferred.length > 0 ? (prefMatches / normPreferred.length) * 30 : 20;

  const totalMatch = Math.min(100, Math.max(30, Math.round(reqScore + prefScore)));

  return {
    matchPercentage: totalMatch,
    strongSkills,
    missingSkills,
  };
};

// GET /api/candidates/search
exports.searchCandidates = async (req, res, next) => {
  try {
    const {
      skills,
      jobId,
      userType,
      experienceLevel,
      location,
      minCGPA,
      search,
    } = req.query;

    if ((jobId && !mongoose.Types.ObjectId.isValid(jobId)) ||
        (userType && userType !== "All" && !["student", "fresher", "professional"].includes(userType)) ||
        (skills && typeof skills !== "string")) {
      return res.status(400).json({ success: false, message: "Invalid candidate search filter" });
    }

    let targetJob = null;
    if (jobId) {
      const employer = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
      targetJob = await Job.findOne({ _id: jobId, $or: [
        { createdBy: req.user._id }, ...(employer ? [{ employerId: employer._id }] : []),
      ] });
      if (!targetJob) return res.status(404).json({ success: false, message: "Job not found" });
    }

    const query = { role: "user" };
    if (userType && userType !== "All") {
      query.userType = userType;
    }

    if (typeof search === "string" && search.trim()) {
      const term = escapeRegex(search.trim());
      query.$or = [
        { fullName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .limit(50)
      .lean();

    // Fetch candidate profiles
    const userIds = users.map((u) => u._id);
    const [studentProfiles, fresherProfiles, professionalProfiles] = await Promise.all([
      StudentProfile.find({ userId: { $in: userIds } }).lean(),
      FresherProfile.find({ userId: { $in: userIds } }).lean(),
      ProfessionalProfile.find({ userId: { $in: userIds } }).lean(),
    ]);

    const studentMap = new Map(
      studentProfiles.filter((p) => p?.userId).map((p) => [p.userId.toString(), p])
    );
    const fresherMap = new Map(
      fresherProfiles.filter((p) => p?.userId).map((p) => [p.userId.toString(), p])
    );
    const professionalMap = new Map(
      professionalProfiles.filter((p) => p?.userId).map((p) => [p.userId.toString(), p])
    );

    const candidates = users.map((user) => {
      const uId = user._id.toString();
      const sProf = studentMap.get(uId);
      const fProf = fresherMap.get(uId);
      const pProf = professionalMap.get(uId);

      const candidateSkills = Array.from(
        new Set([
          ...extractProfileSkills(sProf),
          ...extractProfileSkills(fProf),
          ...extractProfileSkills(pProf),
        ])
      );
      // const candidateSkills = [
      //   ...(Array.isArray(sProf?.skills) ? sProf.skills.map((s) => (typeof s === "string" ? s : s?.name || "")) : []),
      //   ...(Array.isArray(fProf?.skills) ? fProf.skills : []),
      //   ...(Array.isArray(pProf?.skills) ? pProf.skills : []),
      // ].filter(Boolean);

      // Match scoring
      let matchInfo = { matchPercentage: 80, strongSkills: candidateSkills.slice(0, 4), missingSkills: [] };
      if (targetJob) {
        matchInfo = calculateMatch(
          candidateSkills,
          targetJob.requiredSkills || [],
          targetJob.preferredSkills || []
        );
      } else if (skills) {
        const skillArray = skills.split(",").map((s) => s.trim());
        matchInfo = calculateMatch(candidateSkills, skillArray, []);
      }

      const education = sProf?.education?.[0] || fProf?.education?.[0] || pProf?.education?.[0] || {};
      const experience = pProf?.workExperience?.[0] || {};
      const jobTitle =
        experience.jobTitle ||
        experience.designation ||
        (user.userType === "student" ? "Undergraduate Student" : "Software Associate");
      const cgpa = education.score || education.grade || education.cgpa || "8.5";

      return {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        userType: user.userType,
        socialLinks: user.socialLinks,
        skills: candidateSkills,
        degree: education.degree || "B.Tech Computer Science",
        institution: education.institution || "Geeta University",
        graduationYear: education.endYear || 2026,
        cgpa,
        jobTitle,
        experienceYears: user.userType === "professional" ? "2+ Years" : "Fresher",
        matchPercentage: matchInfo.matchPercentage,
        strongSkills: matchInfo.strongSkills,
        missingSkills: matchInfo.missingSkills,
        location: "Panipat, Haryana / Delhi NCR",
        availability: "Immediate / Within 15 Days",
        profileCompletion: user.profileCompletion || 80,
      };
    });

    // Sort by match percentage desc
    candidates.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.status(200).json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/candidates/:id
exports.getCandidateById = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: "user" })
      .select("fullName email phone profileImage userType socialLinks profileCompletion").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    const [studentProfile, fresherProfile, professionalProfile] = await Promise.all([
      StudentProfile.findOne({ userId: user._id }).lean(),
      FresherProfile.findOne({ userId: user._id }).lean(),
      ProfessionalProfile.findOne({ userId: user._id }).lean(),
    ]);

    const profile = studentProfile || fresherProfile || professionalProfile || {};
    const candidateSkills = Array.from(
      new Set([
        ...extractProfileSkills(studentProfile),
        ...extractProfileSkills(fresherProfile),
        ...extractProfileSkills(professionalProfile),
      ])
    );

    return res.status(200).json({
      success: true,
      candidate: {
        ...user,
        skills: candidateSkills,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
