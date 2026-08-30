const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const Job = require("../models/Job");

/**
 * Modular match score calculation algorithm
 */
const calculateMatch = (candidateSkills = [], jobRequiredSkills = [], jobPreferredSkills = []) => {
  if (!jobRequiredSkills.length && !jobPreferredSkills.length) {
    return {
      matchPercentage: 85,
      strongSkills: candidateSkills.slice(0, 3),
      missingSkills: [],
    };
  }

  const normCandidate = candidateSkills.map((s) => s.toLowerCase().trim());
  const normRequired = jobRequiredSkills.map((s) => s.toLowerCase().trim());
  const normPreferred = jobPreferredSkills.map((s) => s.toLowerCase().trim());

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

    let targetJob = null;
    if (jobId) {
      targetJob = await Job.findById(jobId);
    }

    const query = { role: "user" };
    if (userType && userType !== "All") {
      query.userType = userType;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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

    const studentMap = new Map(studentProfiles.map((p) => [p.userId.toString(), p]));
    const fresherMap = new Map(fresherProfiles.map((p) => [p.userId.toString(), p]));
    const professionalMap = new Map(professionalProfiles.map((p) => [p.userId.toString(), p]));

    const candidates = users.map((user) => {
      const uId = user._id.toString();
      const sProf = studentMap.get(uId);
      const fProf = fresherMap.get(uId);
      const pProf = professionalMap.get(uId);

      const candidateSkills = [
        ...(sProf?.skills?.map((s) => (typeof s === "string" ? s : s.name)) || []),
        ...(fProf?.skills || []),
        ...(pProf?.skills || []),
      ];

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

      const education = sProf?.education?.[0] || fProf?.education?.[0] || {};
      const experience = pProf?.workExperience?.[0] || {};

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
        cgpa: education.score || "8.5",
        jobTitle: experience.designation || user.userType === "student" ? "Undergraduate Student" : "Software Associate",
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
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    const [studentProfile, fresherProfile, professionalProfile] = await Promise.all([
      StudentProfile.findOne({ userId: user._id }).lean(),
      FresherProfile.findOne({ userId: user._id }).lean(),
      ProfessionalProfile.findOne({ userId: user._id }).lean(),
    ]);

    const profile = studentProfile || fresherProfile || professionalProfile || {};

    return res.status(200).json({
      success: true,
      candidate: {
        ...user,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
