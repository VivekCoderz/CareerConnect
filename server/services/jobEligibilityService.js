// server/services/jobEligibilityService.js
const Job = require("../models/Job");
const JobVisibility = require("../models/JobVisibility");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const Application = require("../models/Application");

/**
 * Text normalizer helper for fuzzy/alias comparisons
 */
const normalize = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s+#.]/g, "")
    .replace(/\s+/g, " ");
};

/**
 * Normalizes skill names for intelligent matching:
 * e.g. "React.js", "reactjs", "React" -> "react"
 * "Node.js", "nodejs", "Node" -> "node"
 * "JavaScript", "JS" -> "javascript"
 */
const normalizeSkill = (skill) => {
  const s = normalize(skill);
  if (s === "react.js" || s === "reactjs") return "react";
  if (s === "node.js" || s === "nodejs") return "node";
  if (s === "js") return "javascript";
  if (s === "ts") return "typescript";
  if (s === "py") return "python";
  if (s === "mongo" || s === "mongodb") return "mongodb";
  if (s === "postgres" || s === "postgresql") return "postgresql";
  if (s === "express" || s === "express.js" || s === "expressjs") return "express";
  return s;
};

/**
 * Normalizes institution names for comparison:
 * e.g. "Geeta University", "Geeta University, Panipat", "GU"
 */
const isSameInstitution = (inst1, inst2) => {
  const n1 = normalize(inst1);
  const n2 = normalize(inst2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  if (
    (n1.includes("geeta") && n2.includes("geeta")) ||
    (n1 === "gu" && n2.includes("geeta")) ||
    (n2 === "gu" && n1.includes("geeta"))
  ) {
    return true;
  }
  return false;
};

/**
 * Extracts student's real profile data from User, StudentProfile, or FresherProfile
 */
const getStudentProfileData = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const [studentProfile, fresherProfile] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    FresherProfile.findOne({ userId }).lean(),
  ]);

  // Aggregate institution
  let institution = "";
  if (studentProfile?.education && studentProfile.education.length > 0) {
    const primaryEdu = studentProfile.education[0];
    institution = primaryEdu.institution || "";
  }
  if (!institution && fresherProfile?.education && fresherProfile.education.length > 0) {
    institution = fresherProfile.education[0].institution || "";
  }
  if (!institution) {
    institution = user.college || "";
  }

  // Aggregate degree & field
  let degree = "";
  let branch = "";
  let endYear = null;
  let cgpa = null;

  if (studentProfile?.education && studentProfile.education.length > 0) {
    const edu = studentProfile.education[0];
    degree = edu.degree || "";
    branch = edu.fieldOfStudy || "";
    endYear = edu.endYear || null;
    const gradeNum = parseFloat(edu.grade);
    if (!isNaN(gradeNum)) cgpa = gradeNum;
  }

  if (!degree && fresherProfile?.education && fresherProfile.education.length > 0) {
    const edu = fresherProfile.education[0];
    degree = edu.degree || "";
    branch = edu.fieldOfStudy || "";
    endYear = edu.endYear || null;
  }

  if (!degree) degree = user.course || "";
  if (!branch) branch = user.stream || "";
  if (!endYear && user.endYear) endYear = user.endYear;

  // Aggregate actual skills
  const skillsSet = new Set();

  // From StudentProfile
  if (Array.isArray(studentProfile?.technicalSkills)) {
    studentProfile.technicalSkills.forEach((s) => s && skillsSet.add(s.trim()));
  }
  if (Array.isArray(studentProfile?.softSkills)) {
    studentProfile.softSkills.forEach((s) => s && skillsSet.add(s.trim()));
  }
  if (Array.isArray(studentProfile?.experience)) {
    studentProfile.experience.forEach((exp) => {
      if (Array.isArray(exp.skillsUsed)) {
        exp.skillsUsed.forEach((s) => s && skillsSet.add(s.trim()));
      }
    });
  }

  // From FresherProfile
  if (Array.isArray(fresherProfile?.skills)) {
    fresherProfile.skills.forEach((s) => {
      if (typeof s === "string") skillsSet.add(s.trim());
      else if (s?.name) skillsSet.add(s.name.trim());
    });
  }

  // From User model
  if (Array.isArray(user.interests)) {
    user.interests.forEach((s) => s && skillsSet.add(s.trim()));
  }

  const rawSkills = Array.from(skillsSet);

  return {
    userId: user._id,
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    userType: user.userType || "student",
    institution: institution.trim(),
    degree: degree.trim(),
    branch: branch.trim(),
    endYear: endYear ? Number(endYear) : null,
    cgpa,
    skills: rawSkills,
    skillsNormalized: rawSkills.map(normalizeSkill),
  };
};

/**
 * Evaluates whether a student meets the criteria for a job's visibility configuration
 */
const evaluateStudentEligibility = (student, visibilityConfig, job) => {
  const reasons = [];
  const breakdown = {
    institutionMatch: false,
    skillsMatch: false,
    degreeMatch: false,
    branchMatch: false,
    graduationYearMatch: false,
    experienceMatch: false,
  };

  const hiringScope = visibilityConfig?.hiringScope || "On-Campus";
  const targetInstitution = visibilityConfig?.targetInstitution || "Geeta University";
  const allowedInstitutions = Array.isArray(visibilityConfig?.allowedInstitutions) && visibilityConfig.allowedInstitutions.length > 0
    ? visibilityConfig.allowedInstitutions
    : [targetInstitution];

  // 1. INSTITUTION CHECK (Visibility Gate)
  let isInstitutionAllowed = false;
  if (hiringScope === "On-Campus") {
    isInstitutionAllowed = allowedInstitutions.some((allowed) =>
      isSameInstitution(student.institution, allowed)
    );

    if (isInstitutionAllowed) {
      breakdown.institutionMatch = true;
    } else {
      reasons.push(
        `On-campus drive reserved for students of ${targetInstitution}. (Your institution: ${student.institution || "Not specified"})`
      );
    }
  } else {
    // Open / Off-Campus is visible to all institutions
    isInstitutionAllowed = true;
    breakdown.institutionMatch = true;
  }

  // If On-Campus and institution doesn't match, job is NOT VISIBLE and NOT ELIGIBLE
  if (!isInstitutionAllowed) {
    return {
      isVisible: false,
      isEligible: false,
      hiringScope,
      targetInstitution,
      matchScore: 0,
      matchedSkills: [],
      missingSkills: visibilityConfig?.requiredSkills || [],
      reasons,
      breakdown,
    };
  }

  // Job is visible, now check eligibility criteria
  const requiredSkills = Array.isArray(visibilityConfig?.requiredSkills)
    ? visibilityConfig.requiredSkills
    : Array.isArray(job?.requiredSkills)
    ? job.requiredSkills
    : [];

  // 2. SKILLS CHECK
  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((reqSkill) => {
    const normReq = normalizeSkill(reqSkill);
    const hasSkill = student.skillsNormalized.some(
      (studentSkillNorm) => studentSkillNorm === normReq || studentSkillNorm.includes(normReq) || normReq.includes(studentSkillNorm)
    );

    if (hasSkill) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  });

  const totalRequired = requiredSkills.length;
  const matchScore = totalRequired === 0
    ? 100
    : Math.round((matchedSkills.length / totalRequired) * 100);

  // Skill requirement passes if student has all required skills (or totalRequired is 0)
  if (totalRequired === 0 || missingSkills.length === 0) {
    breakdown.skillsMatch = true;
  } else {
    reasons.push(`Missing required skills: ${missingSkills.join(", ")}`);
  }

  // 3. DEGREE CHECK
  const criteria = visibilityConfig?.eligibilityCriteria || {};
  const allowedDegrees = Array.isArray(criteria.degrees) ? criteria.degrees.filter(Boolean) : [];
  if (allowedDegrees.length === 0) {
    breakdown.degreeMatch = true;
  } else {
    const studentDegreeNorm = normalize(student.degree);
    const degreePass = allowedDegrees.some((d) => {
      const normD = normalize(d);
      return (
        normD === "any" ||
        normD === "any graduate" ||
        studentDegreeNorm.includes(normD) ||
        normD.includes(studentDegreeNorm)
      );
    });

    if (degreePass) {
      breakdown.degreeMatch = true;
    } else {
      reasons.push(`Degree must be one of: ${allowedDegrees.join(", ")} (Yours: ${student.degree || "Not specified"})`);
    }
  }

  // 4. BRANCH / STREAM CHECK
  const allowedBranches = Array.isArray(criteria.branches) ? criteria.branches.filter(Boolean) : [];
  if (allowedBranches.length === 0) {
    breakdown.branchMatch = true;
  } else {
    const studentBranchNorm = normalize(student.branch);
    const branchPass = allowedBranches.some((b) => {
      const normB = normalize(b);
      return (
        normB === "any" ||
        normB === "any branch" ||
        studentBranchNorm.includes(normB) ||
        normB.includes(studentBranchNorm)
      );
    });

    if (branchPass) {
      breakdown.branchMatch = true;
    } else {
      reasons.push(`Branch must be one of: ${allowedBranches.join(", ")} (Yours: ${student.branch || "Not specified"})`);
    }
  }

  // 5. GRADUATION YEAR CHECK
  const allowedYears = Array.isArray(criteria.graduationYears)
    ? criteria.graduationYears.map(Number).filter((y) => !isNaN(y) && y > 0)
    : [];

  if (allowedYears.length === 0) {
    breakdown.graduationYearMatch = true;
  } else {
    const yearPass = student.endYear && allowedYears.includes(Number(student.endYear));
    if (yearPass) {
      breakdown.graduationYearMatch = true;
    } else {
      reasons.push(`Graduation batch must be: ${allowedYears.join(", ")} (Yours: ${student.endYear || "Not specified"})`);
    }
  }

  // 6. EXPERIENCE CHECK
  // For campus & entry-level jobs, default to true unless specified
  breakdown.experienceMatch = true;

  // Final Eligibility decision
  const isEligible =
    breakdown.institutionMatch &&
    breakdown.skillsMatch &&
    breakdown.degreeMatch &&
    breakdown.branchMatch &&
    breakdown.graduationYearMatch;

  return {
    isVisible: true,
    isEligible,
    hiringScope,
    targetInstitution,
    matchScore,
    matchedSkills,
    missingSkills,
    reasons,
    breakdown,
  };
};

/**
 * Returns all jobs that the student is permitted to see and their eligibility status
 */
const getEligibleJobsForStudent = async (userId, options = {}) => {
  const student = await getStudentProfileData(userId);
  if (!student) {
    throw new Error("Student profile not found");
  }

  const { scope, onlyEligible } = options;

  // Find all active published jobs
  const jobs = await Job.find({ status: "Published" })
    .populate("employerId", "companyName logo industry companyType")
    .populate("companyId", "name logo industry website")
    .sort({ createdAt: -1 })
    .lean();

  if (jobs.length === 0) {
    return { student, jobs: [], counts: { total: 0, onCampus: 0, offCampus: 0, eligible: 0 } };
  }

  const jobIds = jobs.map((j) => j._id);
  const visibilityConfigs = await JobVisibility.find({
    jobId: { $in: jobIds },
    isActive: true,
  }).lean();

  const visibilityMap = new Map();
  visibilityConfigs.forEach((cfg) => {
    visibilityMap.set(cfg.jobId.toString(), cfg);
  });

  // Check if student has already applied
  const existingApplications = await Application.find({
    candidateId: userId,
    jobId: { $in: jobIds },
  })
    .select("jobId status stage appliedAt")
    .lean();

  const appliedMap = new Map();
  existingApplications.forEach((app) => {
    if (app.jobId) appliedMap.set(app.jobId.toString(), app);
  });

  const results = [];
  let onCampusCount = 0;
  let offCampusCount = 0;
  let eligibleCount = 0;

  for (const job of jobs) {
    const config = visibilityMap.get(job._id.toString()) || {
      hiringScope: "On-Campus",
      targetInstitution: "Geeta University",
      allowedInstitutions: ["Geeta University"],
      requiredSkills: job.requiredSkills || [],
      eligibilityCriteria: {
        degrees: [],
        branches: [],
        graduationYears: [],
      },
    };

    const evaluation = evaluateStudentEligibility(student, config, job);

    // Strict Backend Security Filter:
    // If On-Campus and student's institution doesn't match, DO NOT INCLUDE in results at all!
    if (!evaluation.isVisible) {
      continue;
    }

    if (config.hiringScope === "On-Campus") {
      onCampusCount++;
    } else {
      offCampusCount++;
    }

    if (evaluation.isEligible) {
      eligibleCount++;
    }

    // Optional filters
    if (scope && scope !== "All" && config.hiringScope !== scope) {
      continue;
    }

    if (onlyEligible === "true" && !evaluation.isEligible) {
      continue;
    }

    const applicationStatus = appliedMap.get(job._id.toString()) || null;

    results.push({
      ...job,
      visibilityConfig: config,
      evaluation,
      hasApplied: Boolean(applicationStatus),
      applicationStatus,
    });
  }

  return {
    student: {
      fullName: student.fullName,
      email: student.email,
      institution: student.institution,
      degree: student.degree,
      branch: student.branch,
      endYear: student.endYear,
      skills: student.skills,
    },
    counts: {
      total: results.length,
      onCampus: onCampusCount,
      offCampus: offCampusCount,
      eligible: eligibleCount,
    },
    jobs: results,
  };
};

/**
 * Backend Security Verification:
 * Validates whether a specific student is authorized to view or apply to a job.
 * Throws an authorization error if unauthorized.
 */
const verifyStudentCanAccessJob = async (userId, jobId) => {
  const student = await getStudentProfileData(userId);
  if (!student) {
    const err = new Error("Student profile not found");
    err.statusCode = 404;
    throw err;
  }

  const job = await Job.findById(jobId).lean();
  if (!job) {
    const err = new Error("Job listing not found");
    err.statusCode = 404;
    throw err;
  }

  const config = await JobVisibility.findOne({ jobId, isActive: true }).lean() || {
    hiringScope: "On-Campus",
    targetInstitution: "Geeta University",
    allowedInstitutions: ["Geeta University"],
    requiredSkills: job.requiredSkills || [],
  };

  const evaluation = evaluateStudentEligibility(student, config, job);

  // Strict backend security check:
  if (!evaluation.isVisible) {
    const err = new Error(
      `Access denied: This is an On-Campus job restricted to students of ${config.targetInstitution}. You cannot view or apply from ${student.institution || "your institution"}.`
    );
    err.statusCode = 403;
    err.evaluation = evaluation;
    throw err;
  }

  return { student, job, config, evaluation };
};

module.exports = {
  normalizeSkill,
  isSameInstitution,
  getStudentProfileData,
  evaluateStudentEligibility,
  getEligibleJobsForStudent,
  verifyStudentCanAccessJob,
};
