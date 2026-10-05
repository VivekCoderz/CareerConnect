const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { escapeRegex } = require("../utils/listingSecurity");
const { getOwnerScope, listingOwnerClauses, applicationOwnerClauses } = require("../utils/employerOwnership");
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

const NOT_ENOUGH_DATA = "Not enough data";

/**
 * Skill match between a candidate and a job's required / preferred skills.
 * Only skills that are actually listed count: with no skills on either side there is no
 * score (null + reason), never a default percentage. Required skills weigh 70%,
 * preferred 30%; when only one list exists it carries the full weight.
 */
const calculateMatch = (candidateSkills = [], jobRequiredSkills = [], jobPreferredSkills = []) => {
  const clean = (list) => (Array.isArray(list) ? list : []).filter(Boolean).map((s) => String(s).toLowerCase().trim());
  const normCandidate = clean(candidateSkills);
  const normRequired = clean(jobRequiredSkills);
  const normPreferred = clean(jobPreferredSkills);

  if ((!normRequired.length && !normPreferred.length) || !normCandidate.length) {
    return { matchPercentage: null, matchReason: NOT_ENOUGH_DATA, strongSkills: [], missingSkills: normRequired };
  }

  const has = (skill) => normCandidate.some((c) => c.includes(skill) || skill.includes(c));
  const strongSkills = normRequired.filter(has);
  const missingSkills = normRequired.filter((skill) => !has(skill));
  const preferredMatched = normPreferred.filter(has);
  preferredMatched.forEach((skill) => { if (!strongSkills.includes(skill)) strongSkills.push(skill); });

  const requiredRatio = normRequired.length ? (normRequired.length - missingSkills.length) / normRequired.length : null;
  const preferredRatio = normPreferred.length ? preferredMatched.length / normPreferred.length : null;
  const score = requiredRatio !== null && preferredRatio !== null
    ? requiredRatio * 70 + preferredRatio * 30
    : (requiredRatio ?? preferredRatio) * 100;

  return { matchPercentage: Math.round(score), matchReason: null, strongSkills, missingSkills };
};

/**
 * IDs of the given candidates who applied to one of this employer's jobs or
 * internships. Only these candidates' email and phone are shown to the employer.
 */
const formatLocation = (location) => {
  if (!location) return null;
  if (typeof location === "string") return location;
  return [location.city, location.state].filter(Boolean).join(", ") || null;
};

const getApplicantIdsForEmployer = async (user, candidateIds) => {
  if (candidateIds.length === 0) return new Set();
  const applicationClauses = await applicationOwnerClauses(await getOwnerScope(user));
  const applicantIds = await Application.find({
    candidateId: { $in: candidateIds },
    $or: applicationClauses,
  }).distinct("candidateId");
  return new Set(applicantIds.map(String));
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
      targetJob = await Job.findOne({ _id: jobId, $or: listingOwnerClauses(await getOwnerScope(req.user)) });
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

    const applicantIds = await getApplicantIdsForEmployer(req.user, userIds);

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

      // Match scoring: only against a target job or searched skills; otherwise there is
      // nothing to match, so no percentage.
      let matchInfo = { matchPercentage: null, matchReason: NOT_ENOUGH_DATA, strongSkills: [], missingSkills: [] };
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
      // Real profile fields: a professional's current role (or latest experience entry),
      // a fresher's latest internship role.
      const jobTitle =
        pProf?.currentEmployment?.jobTitle ||
        pProf?.experience?.[0]?.jobTitle ||
        fProf?.internships?.[0]?.role ||
        null;
      const experienceYears = pProf?.experience?.length ? pProf.totalExperienceYears ?? null : null;
      // Fresher / professional education uses graduationYear and percentageOrCgpa.
      const cgpa = education.score || education.grade || education.cgpa || education.percentageOrCgpa || null;

      return {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        // Contact details only for candidates who applied to this employer
        email: applicantIds.has(String(user._id)) ? user.email : null,
        phone: applicantIds.has(String(user._id)) ? user.phone : null,
        profileImage: user.profileImage,
        userType: user.userType,
        socialLinks: user.socialLinks,
        skills: candidateSkills,
        degree: education.degree || null,
        institution: education.institution || null,
        graduationYear: education.endYear || education.graduationYear || null,
        cgpa,
        jobTitle,
        experienceYears,
        matchPercentage: matchInfo.matchPercentage,
        matchReason: matchInfo.matchReason,
        strongSkills: matchInfo.strongSkills,
        missingSkills: matchInfo.missingSkills,
        location: formatLocation(sProf?.location || fProf?.location || pProf?.location),
        availability: null,
        profileCompletion: user.profileCompletion || 0,
      };
    });

    // Sort by match percentage desc; candidates without a score go last.
    candidates.sort((a, b) => (b.matchPercentage ?? -1) - (a.matchPercentage ?? -1));

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

    const applicantIds = await getApplicantIdsForEmployer(req.user, [user._id]);
    if (!applicantIds.has(String(user._id))) {
      user.email = null;
      user.phone = null;
    }

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
