const mongoose = require("mongoose");
const User = require("../models/User");
const FresherProfile = require("../models/FresherProfile");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { isEligibleForInternship } = require("../utils/eligibility");
const { getAggregatedOpportunities } = require("../services/jobScraperService");

// Skill benchmarks for target roles for Job Matching & Skill Gap Analysis
const ROLE_SKILL_BENCHMARKS = {
  "Full Stack Developer": [
    "JavaScript", "React", "Node.js", "Express", "MongoDB", "REST API", "Git", "HTML", "CSS", "TypeScript"
  ],
  "Frontend Developer": [
    "JavaScript", "React", "HTML", "CSS", "Tailwind CSS", "TypeScript", "Redux", "Git"
  ],
  "Backend Developer": [
    "Node.js", "Express", "MongoDB", "SQL", "REST API", "Python", "Docker", "Authentication", "Git"
  ],
  "Software Developer": [
    "Data Structures", "Algorithms", "Java", "C++", "Python", "SQL", "Git", "OOP"
  ],
  "Junior Software Engineer": [
    "JavaScript", "Python", "Java", "Data Structures", "SQL", "Git", "Problem Solving"
  ],
  "Data Analyst": [
    "Python", "SQL", "Excel", "Pandas", "NumPy", "Data Visualization", "PowerBI", "Tableau"
  ],
  "QA Engineer": [
    "JavaScript", "Selenium", "Manual Testing", "Automation Testing", "Postman", "Jest", "Git"
  ],
  "DevOps Engineer": [
    "Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Git", "Shell Scripting"
  ],
};

// ==========================================
// DYNAMIC PROFILE COMPLETION (Weighted logic)
// Allows reaching 100% even without internship
// ==========================================
const calculateFresherProfileCompletion = (profile, user) => {
  let score = 0;

  // 1. Basic Info (10%)
  const hasBasicInfo = !!(
    (user?.fullName || profile?.userId?.fullName) &&
    (user?.email || profile?.userId?.email) &&
    (user?.phone || profile?.userId?.phone || profile?.location?.city)
  );
  if (hasBasicInfo) score += 10;

  // 2. Professional Headline & Objective (10%)
  if (profile?.professionalHeadline && profile.professionalHeadline.trim().length >= 5) score += 5;
  if (profile?.careerObjective && profile.careerObjective.trim().length >= 10) score += 5;

  // 3. Educational Qualification (15%)
  if (profile?.education && profile.education.length > 0) {
    const highest = profile.education.find((e) => e.degree && e.institution);
    if (highest) score += 15;
    else score += 10;
  }

  // 4. Skills (15%)
  const totalSkills =
    (profile?.skills?.programmingLanguages?.length || 0) +
    (profile?.skills?.frameworks?.length || 0) +
    (profile?.skills?.databases?.length || 0) +
    (profile?.skills?.tools?.length || 0) +
    (profile?.skills?.softSkills?.length || 0) +
    (profile?.skills?.technical?.length || 0);

  if (totalSkills >= 4) score += 15;
  else if (totalSkills >= 2) score += 10;
  else if (totalSkills > 0) score += 5;

  // 5. Projects (15%)
  if (profile?.projects && profile.projects.length >= 2) score += 15;
  else if (profile?.projects && profile.projects.length === 1) score += 10;

  // 6. Job Preferences & Availability (10%)
  const hasPreferences =
    (profile?.jobPreferences?.preferredRoles?.length > 0 || profile?.targetRole) &&
    (profile?.jobPreferences?.preferredLocations?.length > 0 || profile?.jobPreferences?.workMode?.length > 0);
  if (hasPreferences) score += 10;

  // 7. Resume (10%)
  const hasResume = !!(profile?.resume?.resumeUrl || profile?.resume?.resumeName || profile?.resume?.isGenerated);
  if (hasResume) score += 10;

  // 8. Experience / Internship OR Certifications / Achievements (15% flexible distribution)
  const hasInternship = profile?.internships && profile.internships.length > 0;
  const hasCertifications = profile?.certifications && profile.certifications.length > 0;
  const hasAchievements = profile?.achievements && profile.achievements.length > 0;
  const hasCodingProfiles = profile?.codingProfiles && profile.codingProfiles.length > 0;

  if (hasInternship && (hasCertifications || hasAchievements)) {
    score += 15;
  } else if (hasInternship || hasCertifications || hasAchievements) {
    score += 10;
  }

  if (hasCodingProfiles) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
};

// ==========================================
// JOB READINESS SCORE (0 - 100) & BREAKDOWN
// ==========================================
const calculateFresherJobReadiness = (profile, completion) => {
  const breakdown = {
    profileStrength: { score: completion, max: 100, weight: 20 },
    skillsScore: { score: 0, max: 100, weight: 25 },
    projectsScore: { score: 0, max: 100, weight: 20 },
    resumeScore: { score: 0, max: 100, weight: 15 },
    credentialsScore: { score: 0, max: 100, weight: 10 },
    preferencesScore: { score: 0, max: 100, weight: 10 },
  };

  // Skills scoring based on categorized proficiencies
  let skillsCount = 0;
  let advancedCount = 0;
  const categories = ["programmingLanguages", "frameworks", "databases", "tools", "softSkills", "technical"];
  categories.forEach((cat) => {
    const list = profile?.skills?.[cat] || [];
    skillsCount += list.length;
    advancedCount += list.filter((s) => s.proficiency === "Advanced" || s.proficiency === "Intermediate").length;
  });
  breakdown.skillsScore.score = Math.min(100, Math.round(skillsCount * 12 + advancedCount * 5));

  // Projects scoring
  const projects = profile?.projects || [];
  let projScore = 0;
  if (projects.length >= 1) projScore += 40;
  if (projects.length >= 2) projScore += 30;
  const hasLinks = projects.some((p) => p.githubUrl || p.liveUrl);
  if (hasLinks) projScore += 30;
  breakdown.projectsScore.score = Math.min(100, projScore);

  // Resume scoring
  const hasResume = !!(profile?.resume?.resumeUrl || profile?.resume?.resumeName || profile?.resume?.isGenerated);
  breakdown.resumeScore.score = hasResume ? 100 : 0;

  // Credentials (Certs, achievements, coding profiles, internships)
  let credScore = 0;
  if (profile?.certifications?.length > 0) credScore += 30;
  if (profile?.achievements?.length > 0) credScore += 25;
  if (profile?.codingProfiles?.length > 0) credScore += 25;
  if (profile?.internships?.length > 0) credScore += 20;
  breakdown.credentialsScore.score = Math.min(100, credScore);

  // Preferences & Availability
  let prefScore = 0;
  if (profile?.jobPreferences?.preferredRoles?.length > 0) prefScore += 40;
  if (profile?.jobPreferences?.preferredLocations?.length > 0) prefScore += 30;
  if (profile?.availability?.status) prefScore += 30;
  breakdown.preferencesScore.score = Math.min(100, prefScore);

  const totalScore = Math.round(
    breakdown.profileStrength.score * 0.2 +
      breakdown.skillsScore.score * 0.25 +
      breakdown.projectsScore.score * 0.2 +
      breakdown.resumeScore.score * 0.15 +
      breakdown.credentialsScore.score * 0.1 +
      breakdown.preferencesScore.score * 0.1
  );

  const tips = [];
  if (skillsCount < 5) tips.push("Add at least 5 key technical skills with proficiency levels.");
  if (projects.length < 2) tips.push("Add 2 or more projects with live demo or GitHub links.");
  if (!projects.some((p) => p.liveUrl)) tips.push("Include a live deployment link for your best project.");
  if (!hasResume) tips.push("Build or upload your resume to unlock 1-click recruiter applications.");
  if ((profile?.codingProfiles?.length || 0) === 0) tips.push("Connect your LeetCode, GitHub, or HackerRank profile to showcase coding agility.");
  if ((profile?.certifications?.length || 0) === 0 && (profile?.internships?.length || 0) === 0) {
    tips.push("Add a recognized certification or online course credential.");
  }
  if (!profile?.jobPreferences?.expectedSalary?.min) {
    tips.push("Specify your expected salary range to get accurately matched openings.");
  }

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    tips: tips.length > 0 ? tips : ["Your fresher profile is in top-tier shape! You are job-ready."],
  };
};

// Calculate match percentage against a job
const calculateJobMatch = (fresherProfile, jobRequiredSkills = [], jobRole = "") => {
  const allProfileSkills = [];
  const categories = ["programmingLanguages", "frameworks", "databases", "tools", "technical"];
  categories.forEach((cat) => {
    (fresherProfile?.skills?.[cat] || []).forEach((s) => allProfileSkills.push(s.name.toLowerCase()));
  });

  if (jobRequiredSkills.length === 0) return 85;

  let matched = 0;
  jobRequiredSkills.forEach((reqSkill) => {
    if (allProfileSkills.some((s) => s.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(s))) {
      matched += 1;
    }
  });

  let matchPct = Math.round((matched / jobRequiredSkills.length) * 100);
  // Give a slight boost if target role matches
  if (
    jobRole &&
    fresherProfile?.targetRole &&
    fresherProfile.targetRole.toLowerCase().includes(jobRole.toLowerCase())
  ) {
    matchPct = Math.min(100, matchPct + 10);
  }

  return Math.min(98, Math.max(45, matchPct));
};

// ==========================================
// GET FRESHER PROFILE
// ==========================================
module.exports.getFresherProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await FresherProfile.findOne({ userId }).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    if (!profile) {
      // Auto initialize sensible fresher profile template
      profile = await FresherProfile.create({
        userId,
        professionalHeadline: "Software Engineering Graduate | Seeking Entry-Level Opportunities",
        targetRole: "Full Stack Developer",
        targetIndustry: "Information Technology",
        careerObjective:
          "Passionate graduate seeking an entry-level software engineering role where I can apply my problem-solving abilities and full-stack development skills.",
        education: [
          {
            qualificationType: "B.Tech",
            degree: "B.Tech Computer Science & Engineering",
            institution: "University / Institute of Technology",
            university: "State Technical University",
            graduationYear: 2024,
            percentageOrCgpa: "8.2 CGPA",
            isHighest: true,
          },
        ],
        skills: {
          programmingLanguages: [
            { name: "JavaScript", proficiency: "Intermediate" },
            { name: "Python", proficiency: "Intermediate" },
          ],
          frameworks: [
            { name: "React", proficiency: "Intermediate" },
            { name: "Node.js", proficiency: "Intermediate" },
            { name: "Express", proficiency: "Intermediate" },
          ],
          databases: [{ name: "MongoDB", proficiency: "Intermediate" }],
          tools: [{ name: "Git", proficiency: "Intermediate" }, { name: "Postman", proficiency: "Beginner" }],
          softSkills: [
            { name: "Problem Solving", proficiency: "Advanced" },
            { name: "Teamwork", proficiency: "Advanced" },
            { name: "Communication", proficiency: "Intermediate" },
          ],
          technical: [],
        },
        jobPreferences: {
          preferredRoles: ["Full Stack Developer", "Frontend Developer", "Junior Software Engineer"],
          employmentTypes: ["Full-time", "Internship", "Graduate Trainee"],
          preferredLocations: ["Bangalore", "Hyderabad", "Pune", "Remote"],
          workMode: ["Hybrid", "Remote", "On-site"],
          expectedSalary: { min: 4.5, max: 8.5, currency: "INR (LPA)" },
        },
        availability: {
          status: "Immediately Available",
          currentEmploymentStatus: "Looking for Job",
        },
        profileVisibility: "public",
      });

      profile = await profile.populate(
        "userId",
        "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
      );
    }

    const completion = calculateFresherProfileCompletion(profile, req.user);
    const readiness = calculateFresherJobReadiness(profile, completion);

    return res.status(200).json({
      success: true,
      profile,
      profileCompletion: completion,
      jobReadiness: readiness,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE FRESHER PROFILE
// ==========================================
module.exports.updateFresherProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = { ...req.body };

    // Synchronize basic user fields if present in updateData
    const userUpdateFields = {};
    if (updateData.fullName) userUpdateFields.fullName = updateData.fullName.trim();
    if (updateData.phone !== undefined && String(updateData.phone).trim()) {
      const cleanPhone = String(updateData.phone).replace(/\D/g, "");
      const countryCode = updateData.countryCode?.trim() || "+91";
      const taken = await User.findOne({
        _id: { $ne: userId },
        $or: [
          { phone: cleanPhone },
          { phone: cleanPhone.slice(-10) },
          { phone: `${countryCode}${cleanPhone}` },
        ],
      });
      if (taken) {
        return res.status(409).json({
          success: false,
          message: "Mobile number is already registered with another account",
        });
      }
      userUpdateFields.phone = cleanPhone;
      if (updateData.countryCode) userUpdateFields.countryCode = updateData.countryCode.trim();
    }
    if (updateData.profileImage !== undefined) userUpdateFields.profileImage = updateData.profileImage;
    if (updateData.socialLinks) {
      userUpdateFields.socialLinks = {
        linkedin: updateData.socialLinks.linkedin || "",
        github: updateData.socialLinks.github || "",
      };
    }

    let profile = await FresherProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    // Calculate updated completion & readiness
    const completion = calculateFresherProfileCompletion(profile, req.user);
    const readiness = calculateFresherJobReadiness(profile, completion);
    const isComplete = completion >= 75;

    profile.profileCompletion = completion;
    profile.jobReadinessScore = readiness.score;
    profile.isProfileComplete = isComplete;
    await profile.save();

    userUpdateFields.profileCompletion = completion;
    userUpdateFields.isProfileComplete = isComplete;

    if (Object.keys(userUpdateFields).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdateFields });
    }

    return res.status(200).json({
      success: true,
      message: "Fresher profile updated successfully",
      profile,
      profileCompletion: completion,
      jobReadiness: readiness,
      isProfileComplete: isComplete,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET FRESHER DASHBOARD DATA
// ==========================================
module.exports.getFresherDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await FresherProfile.findOne({ userId }).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    if (!profile) {
      profile = await FresherProfile.create({
        userId,
        professionalHeadline: "Software Engineering Graduate",
        targetRole: "Full Stack Developer",
        education: [
          {
            qualificationType: "B.Tech",
            degree: "B.Tech Computer Science",
            institution: "University / College",
            graduationYear: 2024,
            isHighest: true,
          },
        ],
        skills: {
          programmingLanguages: [{ name: "JavaScript", proficiency: "Intermediate" }],
          frameworks: [{ name: "React", proficiency: "Intermediate" }],
          databases: [{ name: "MongoDB", proficiency: "Intermediate" }],
          tools: [{ name: "Git", proficiency: "Intermediate" }],
          softSkills: [{ name: "Problem Solving", proficiency: "Intermediate" }],
          technical: [],
        },
      });
      profile = await profile.populate(
        "userId",
        "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
      );
    }

    const completion = calculateFresherProfileCompletion(profile, req.user);
    const readiness = calculateFresherJobReadiness(profile, completion);

    // Fetch Real Database Jobs for Freshers
    let dbJobs = [];
    let dbInternships = [];
    if (mongoose.connection.readyState === 1) {
      try {
        [dbJobs, dbInternships] = await Promise.all([
          Job.find({
            status: "Published",
            employmentType: { $ne: "Internship" },
          })
            .populate("employerId", "companyName logo headquarters")
            .sort({ createdAt: -1 })
            .lean(),
          Job.find({
            status: "Published",
            employmentType: "Internship",
          })
            .populate("employerId", "companyName logo headquarters")
            .sort({ createdAt: -1 })
            .lean(),
        ]);
      } catch (dbErr) {
        console.warn("MongoDB find error in fresherController:", dbErr.message);
      }
    }

    const recommendedJobs = (dbJobs || []).map((job) => {
      const salaryStr =
        job.salaryRange?.min > 0
          ? `₹${(job.salaryRange.min / 100000).toFixed(1)} - ${(job.salaryRange.max / 100000).toFixed(1)} LPA`
          : "Competitive LPA";

      return {
        _id: job._id,
        id: job._id.toString(),
        jobId: job._id.toString(),
        title: job.title,
        company: job.employerId?.companyName || "Partner Employer",
        location: job.location,
        salary: salaryStr,
        type: job.employmentType || "Full-Time",
        workMode: job.workMode || "Hybrid",
        experienceRequired: job.experience?.level || "Fresher / 0-1 Yr",
        skillsRequired: job.requiredSkills || [],
        postedAt: "Active",
        deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open",
        matchPercentage: calculateJobMatch(profile, job.requiredSkills || [], job.title),
      };
    });

    const eligibleDbInternships = (dbInternships || []).filter((job) =>
      isEligibleForInternship(job, profile)
    );

    const recommendedInternships = eligibleDbInternships.map((job) => {
      const stipendStr =
        job.salaryRange?.min > 0
          ? `₹${job.salaryRange.min.toLocaleString()} / month`
          : "Competitive Stipend";

      return {
        _id: job._id,
        id: job._id.toString(),
        jobId: job._id.toString(),
        title: job.title,
        company: job.employerId?.companyName || "Partner Employer",
        location: job.location,
        stipend: stipendStr,
        duration: "3-6 Months",
        type: "Internship",
        workMode: job.workMode || "Remote",
        skillsRequired: job.requiredSkills || [],
        deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open",
      };
    });

    let finalRecommendedJobs = recommendedJobs;
    if (finalRecommendedJobs.length === 0) {
      try {
        const scraped = await getAggregatedOpportunities({
          opportunityType: "all",
          search: profile.targetRole || "Software Developer",
        });
        finalRecommendedJobs = (scraped.data || []).slice(0, 25).map((job, idx) => ({
          _id: `scraped-fresher-job-${idx}`,
          id: `scraped-fresher-job-${idx}`,
          jobId: `scraped-fresher-job-${idx}`,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: "₹4.5 - 12.0 LPA",
          type: job.opportunityType || "Full-Time",
          workMode: job.workMode || "Hybrid",
          experienceRequired: "Fresher / 0-1 Yr",
          skillsRequired: [job.title.split(" ")[0] || "Engineering", "Problem Solving"],
          postedAt: job.postedDate || "Recently",
          deadline: "Open",
          matchPercentage: calculateJobMatch(profile, [job.title.split(" ")[0] || "Development"], job.title),
          applyLink: job.applyLink,
          applyUrl: job.applyLink,
          isExternal: true,
          platformSource: job.platformSource,
        }));
      } catch (e) {
        console.warn("Fresher scraped jobs fallback error:", e.message);
      }
    }

    let finalRecommendedInternships = recommendedInternships;
    if (finalRecommendedInternships.length === 0) {
      try {
        const scraped = await getAggregatedOpportunities({
          opportunityType: "internship",
          search: profile.targetRole || "Developer",
        });
        finalRecommendedInternships = (scraped.data || []).slice(0, 25).map((job, idx) => ({
          _id: `scraped-fresher-int-${idx}`,
          id: `scraped-fresher-int-${idx}`,
          jobId: `scraped-fresher-int-${idx}`,
          title: job.title,
          company: job.company,
          location: job.location,
          stipend: "Competitive Stipend",
          duration: "3-6 Months",
          type: "Internship",
          workMode: job.workMode || "Remote",
          skillsRequired: [job.title.split(" ")[0] || "Engineering"],
          deadline: "Open until filled",
          applyLink: job.applyLink,
          applyUrl: job.applyLink,
          isExternal: true,
          platformSource: job.platformSource,
        }));
      } catch (e) {
        console.warn("Fresher scraped internships fallback error:", e.message);
      }
    }

    // Fetch Real Applications for fresher
    const dbApplications = await Application.find({ candidateId: userId })
      .populate({
        path: "jobId",
        select: "title department location employmentType workMode salaryRange deadline status",
        populate: { path: "employerId", select: "companyName logo" },
      })
      .populate("employerId", "companyName logo")
      .sort({ createdAt: -1 })
      .lean();

    const appStats = {
      applied: dbApplications.filter((a) => a.status === "Applied").length,
      underReview: dbApplications.filter((a) => ["Screening", "Under Review"].includes(a.status)).length,
      shortlisted: dbApplications.filter((a) => a.status === "Shortlisted").length,
      interview: dbApplications.filter((a) => ["Interview", "Final Interview", "Assessment"].includes(a.status)).length,
      selected: dbApplications.filter((a) => ["Offer", "Hired"].includes(a.status)).length,
      rejected: dbApplications.filter((a) => a.status === "Rejected").length,
    };

    const recentApps = dbApplications.map((app) => ({
      _id: app._id,
      id: app._id.toString(),
      jobId: app.jobId?._id || "",
      title: app.jobId?.title || "Position",
      company: app.jobId?.employerId?.companyName || app.employerId?.companyName || "Employer",
      appliedDate: new Date(app.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: app.status,
    }));

    const applications = {
      stats: appStats,
      recent: recentApps,
    };

    // Calculate Target Role & Benchmarks
    const targetRole =
      profile.targetRole ||
      profile.targetRoles?.[0] ||
      profile.jobPreferences?.preferredRoles?.[0] ||
      "Full Stack Developer";

    const benchmarks =
      ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS["Full Stack Developer"];

    const allProfileSkills = [];
    const skillCategories = ["programmingLanguages", "frameworks", "databases", "tools", "technical", "softSkills"];
    skillCategories.forEach((cat) => {
      (profile?.skills?.[cat] || []).forEach((s) => allProfileSkills.push(s.name));
    });
    if (Array.isArray(profile.primarySkills)) {
      profile.primarySkills.forEach((s) => {
        if (!allProfileSkills.includes(s)) allProfileSkills.push(s);
      });
    }

    const userSkillsSet = new Set(allProfileSkills.map((s) => s.toLowerCase()));
    const missingSkills = benchmarks.filter((s) => !userSkillsSet.has(s.toLowerCase()));

    const skillReasons = {
      "Node.js": "Crucial for building scalable, high-throughput backend services and APIs.",
      "Express": "Industry-standard minimalist framework for RESTful routing and middleware.",
      "Express.js": "Industry-standard minimalist framework for RESTful routing and middleware.",
      "MongoDB": "Leading NoSQL database widely used in modern full-stack web applications.",
      "SQL": "Essential for relational data querying, analytics, and enterprise data models.",
      "React": "Most popular component-based frontend library demanded by tech companies.",
      "Docker": "Key containerization tool expected in modern cloud and DevOps environments.",
      "REST API": "Standard architectural style for client-server integration across web applications.",
      "REST APIs": "Standard architectural style for client-server integration across web applications.",
      "TypeScript": "Enables type safety and maintainability in production-grade JavaScript apps.",
      "Git": "Essential version control and collaboration system used across all tech teams.",
      "Python": "High versatility in automation, backend APIs, data engineering, and AI systems.",
      "Data Structures": "Core requirement for passing technical interviews and problem-solving.",
      "Algorithms": "Fundamental for optimizing execution time and scalable code efficiency.",
      "Postman": "Industry tool for designing, testing, and documenting HTTP APIs.",
      "Redux": "Predictable state management for complex Single Page Applications.",
      "PowerBI": "Leading business intelligence tool for interactive data dashboards.",
      "Tableau": "Powerful visual analytics platform used by top data-driven enterprises.",
      "Pandas": "Core Python data manipulation and analysis library.",
    };

    const recommendedSkills = missingSkills.slice(0, 4).map((s) => ({
      name: s,
      reason: skillReasons[s] || `Highly in-demand skill commonly required for ${targetRole} positions.`,
      resourceUrl: `/courses?search=${encodeURIComponent(s)}`,
    }));

    // Recommended Courses
    const recommendedCourses = [
      {
        id: "crs-f1",
        name: `Complete ${targetRole} Bootcamp 2026`,
        platform: "CareerConnect Academy",
        skill: missingSkills[0] || "Full Stack Architecture",
        difficulty: "Beginner to Intermediate",
        duration: "6 Weeks (Self-paced)",
        thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
        url: "/courses/explore/full-stack-bootcamp",
        rating: 4.9,
      },
      {
        id: "crs-f2",
        name: "Data Structures & Algorithms in Java / C++",
        platform: "AlgoPrep",
        skill: "Problem Solving",
        difficulty: "Intermediate",
        duration: "8 Weeks",
        thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60",
        url: "/courses/explore/dsa-mastery",
        rating: 4.8,
      },
      {
        id: "crs-f3",
        name: `Modern RESTful APIs & Backend Architecture with ${missingSkills[0] || "Node.js"}`,
        platform: "Coursera / CareerConnect",
        skill: missingSkills[0] || "Backend Development",
        difficulty: "Intermediate",
        duration: "4 Weeks",
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60",
        url: `/courses?search=${encodeURIComponent(missingSkills[0] || "Node.js")}`,
        rating: 4.9,
      },
      {
        id: "crs-f4",
        name: "Frontend System Design & Performance",
        platform: "Frontend Masters",
        skill: "React & TypeScript",
        difficulty: "Advanced",
        duration: "3 Weeks",
        thumbnail: "https://images.unsplash.com/photo-1581291518655-9523b932eed8?w=500&auto=format&fit=crop&q=60",
        url: "/courses/explore/frontend-system-design",
        rating: 4.7,
      },
    ];

    // Career Recommendations
    const careerRecommendations = [];
    if (missingSkills.length > 0) {
      careerRecommendations.push({
        id: "rec-skill-1",
        title: `Add ${missingSkills[0]} to strengthen your ${targetRole} profile`,
        description: `82% of entry-level ${targetRole} postings list ${missingSkills[0]} as a key requirement.`,
        ctaText: "Explore Learning",
        ctaAction: `/courses?search=${encodeURIComponent(missingSkills[0])}`,
        type: "skill",
      });
    }

    const matchingCount = finalRecommendedJobs.length;
    if (matchingCount > 0) {
      careerRecommendations.push({
        id: "rec-jobs-1",
        title: `${matchingCount} new entry-level roles match your target role`,
        description: `Verified opportunities seeking ${targetRole} candidates with your skill profile.`,
        ctaText: "View Matching Jobs",
        ctaAction: "jobs",
        type: "job",
      });
    }

    if (!profile.projects || profile.projects.length === 0) {
      careerRecommendations.push({
        id: "rec-proj-1",
        title: "Add your latest project to showcase your practical experience",
        description: "Freshers with 2+ projects receive 3.5x more recruiter shortlists.",
        ctaText: "Add Project",
        ctaAction: "/fresher/profile?step=2",
        type: "project",
      });
    }

    if (!profile.resume?.resumeUrl && !profile.resume?.resumeName) {
      careerRecommendations.push({
        id: "rec-res-1",
        title: "Update your resume before applying to new opportunities",
        description: "Upload your latest PDF or use our AI-powered Resume Builder.",
        ctaText: "Upload Resume",
        ctaAction: "/resume-builder",
        type: "resume",
      });
    }

    careerRecommendations.push({
      id: "rec-course-1",
      title: `Explore courses related to ${targetRole}`,
      description: "Upgrade your technical credentials with verified certifications.",
      ctaText: "Browse Courses",
      ctaAction: "/courses",
      type: "course",
    });

    // Recent Activity Timeline
    const recentActivity = [
      {
        id: "act-1",
        type: "profile",
        title: "Fresher Profile Created",
        subtitle: `Configured target role as ${targetRole}`,
        timestamp: "Recently",
      },
      ...(profile.projects && profile.projects.length > 0
        ? [
            {
              id: "act-2",
              type: "project",
              title: `Project Added: ${profile.projects[0].title}`,
              subtitle: `Showcasing ${profile.projects[0].technologies?.join(", ") || "Tech Stack"}`,
              timestamp: "Active",
            },
          ]
        : []),
      ...(profile.resume?.resumeName
        ? [
            {
              id: "act-3",
              type: "resume",
              title: "Resume Uploaded",
              subtitle: profile.resume.resumeName,
              timestamp: "Uploaded",
            },
          ]
        : []),
      ...(recentApps.slice(0, 2).map((app, idx) => ({
        id: `act-app-${idx}`,
        type: "application",
        title: `Applied to ${app.title}`,
        subtitle: `${app.company} · ${app.status}`,
        timestamp: app.appliedDate,
      }))),
    ];

    const careerTarget = {
      targetRole,
      targetRoles: profile.targetRoles?.length > 0 ? profile.targetRoles : [targetRole],
      jobType: profile.jobPreferences?.employmentTypes?.join(", ") || "Full-time opportunities",
      workMode: profile.jobPreferences?.workMode?.join(" / ") || "Remote / Hybrid",
      preferredLocations: profile.jobPreferences?.preferredLocations?.length > 0
        ? profile.jobPreferences.preferredLocations
        : ["Bangalore", "Pune", "Remote"],
      careerGoal: profile.careerGoal || "Get my first job",
      activelyLooking: profile.activelyLooking !== false,
    };

    const experienceSummary = {
      projectsCount: profile.projects?.length || 0,
      internshipsCount: profile.internships?.length || 0,
      certificationsCount: profile.certifications?.length || 0,
      skillsCount: allProfileSkills.length,
      latestProject: profile.projects?.[0] || null,
      latestInternship: profile.internships?.[0] || null,
    };

    return res.status(200).json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          email: req.user.email,
          phone: req.user.phone,
          profileImage: req.user.profileImage,
          role: req.user.role,
          userType: req.user.userType,
          socialLinks: req.user.socialLinks,
        },
        profile,
        profileCompletion: completion,
        jobReadiness: readiness,
        careerTarget,
        skillDevelopment: {
          userSkills: allProfileSkills.slice(0, 10),
          recommendedSkills,
        },
        recommendedCourses,
        careerRecommendations,
        recentActivity,
        experienceSummary,
        recommendedJobs: finalRecommendedJobs,
        recommendedInternships: finalRecommendedInternships,
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET FRESHER RECOMMENDATIONS (Courses & Roles)
// ==========================================
module.exports.getFresherRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await FresherProfile.findOne({ userId });

    const targetRole = profile?.targetRole || profile?.jobPreferences?.preferredRoles?.[0] || "Full Stack Developer";
    const benchmarkSkills = ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS["Full Stack Developer"];

    const allProfileSkills = [];
    const categories = ["programmingLanguages", "frameworks", "databases", "tools", "technical"];
    categories.forEach((cat) => {
      (profile?.skills?.[cat] || []).forEach((s) => allProfileSkills.push(s.name.toLowerCase()));
    });

    const mastered = [];
    const missing = [];

    benchmarkSkills.forEach((skill) => {
      if (allProfileSkills.includes(skill.toLowerCase())) {
        mastered.push(skill);
      } else {
        missing.push(skill);
      }
    });

    const skillGapCourses = [
      {
        id: "crs-f1",
        title: `Industry-Ready ${targetRole} FastTrack`,
        provider: "CareerConnect Pro",
        duration: "4 Weeks",
        rating: 4.9,
        skillsCovered: missing.slice(0, 3),
        isFree: true,
      },
      {
        id: "crs-f2",
        title: "Cracking the Coding Interview & System Design",
        provider: "AlgoPrep Academy",
        duration: "6 Weeks",
        rating: 4.8,
        skillsCovered: ["Data Structures", "Algorithms", "System Architecture"],
        isFree: true,
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        targetRole,
        masteredSkills: mastered,
        skillsToLearn: missing,
        matchPercentage: Math.round((mastered.length / benchmarkSkills.length) * 100),
        recommendedCourses: skillGapCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET PUBLIC FRESHER PROFILE
// ==========================================
module.exports.getPublicFresherProfile = async (req, res, next) => {
  try {
    const { usernameOrId } = req.params;

    let user = null;
    if (usernameOrId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(usernameOrId).select("fullName username email phone profileImage socialLinks userType");
    }
    if (!user) {
      user = await User.findOne({ username: usernameOrId.toLowerCase() }).select(
        "fullName username email phone profileImage socialLinks userType"
      );
    }

    if (!user || user.userType !== "fresher") {
      return res.status(404).json({
        success: false,
        message: "Fresher public profile not found",
      });
    }

    const profile = await FresherProfile.findOne({ userId: user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile has not been created yet",
      });
    }

    if (profile.profileVisibility === "private") {
      return res.status(403).json({
        success: false,
        message: "This profile is private and cannot be viewed publicly.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
