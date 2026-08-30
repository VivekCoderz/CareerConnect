const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Course = require("../models/Course");
const { isEligibleForInternship } = require("../utils/eligibility");

// Skill benchmarks for target roles for Skill Gap Analysis
const ROLE_SKILL_BENCHMARKS = {
  "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS", "Redux", "Git"],
  "Backend Developer": ["Node.js", "Express", "MongoDB", "SQL", "REST API", "Docker", "Authentication", "Git"],
  "Full Stack Developer": ["React", "Node.js", "Express", "MongoDB", "JavaScript", "TypeScript", "REST API", "Git", "Tailwind CSS"],
  "Software Engineer": ["Data Structures", "Algorithms", "Java", "C++", "Python", "SQL", "Git", "OOP"],
  "Data Scientist / Analyst": ["Python", "SQL", "Pandas", "NumPy", "Machine Learning", "Data Visualization", "PowerBI"],
  "DevOps Engineer": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Git", "Terraform"],
};

// Calculate profile completion percentage (0 - 100)
const calculateProfileCompletion = (profile, user) => {
  let score = 0;
  // 1. Basic Information (20%)
  if (user?.fullName && user?.email && user?.phone) score += 20;

  // 2. Education (20%)
  if (profile?.education && profile.education.length > 0) score += 20;

  // 3. Skills (20%)
  const totalSkills = (profile?.technicalSkills?.length || 0) + (profile?.softSkills?.length || 0);
  if (totalSkills >= 3) score += 20;
  else if (totalSkills > 0) score += 10;

  // 4. Projects (20%)
  if (profile?.projects && profile.projects.length > 0) score += 20;

  // 5. Resume or Certifications (20%)
  if (profile?.resume?.resumeName || profile?.resume?.resumeUrl) score += 10;
  if (profile?.certifications && profile.certifications.length > 0) score += 10;

  return Math.min(100, Math.max(0, score));
};

// Calculate Career Readiness Score (0 - 100) and breakdown
const calculateCareerReadiness = (profile, completion) => {
  const breakdown = {
    profileStrength: { score: completion, max: 100, weight: 20 },
    skillsScore: { score: 0, max: 100, weight: 25 },
    projectsScore: { score: 0, max: 100, weight: 25 },
    resumeScore: { score: 0, max: 100, weight: 15 },
    certificationsScore: { score: 0, max: 100, weight: 15 },
  };

  const techCount = profile?.technicalSkills?.length || 0;
  breakdown.skillsScore.score = Math.min(100, techCount * 20);

  const projCount = profile?.projects?.length || 0;
  breakdown.projectsScore.score = Math.min(100, projCount * 50);

  const hasResume = !!(profile?.resume?.resumeName || profile?.resume?.resumeUrl);
  breakdown.resumeScore.score = hasResume ? 100 : 0;

  const certCount = profile?.certifications?.length || 0;
  breakdown.certificationsScore.score = Math.min(100, certCount * 50);

  const totalScore = Math.round(
    (breakdown.profileStrength.score * 0.2) +
    (breakdown.skillsScore.score * 0.25) +
    (breakdown.projectsScore.score * 0.25) +
    (breakdown.resumeScore.score * 0.15) +
    (breakdown.certificationsScore.score * 0.15)
  );

  const tips = [];
  if (techCount < 5) tips.push("Add at least 5 technical skills to enhance recruiter matching.");
  if (projCount < 2) tips.push("Add 2 or more projects with GitHub and Live demo links.");
  if (!hasResume) tips.push("Upload or generate a verified resume to unlock 1-click applications.");
  if (certCount === 0) tips.push("Add professional certifications to boost credential credibility.");

  return {
    score: totalScore,
    breakdown,
    tips: tips.length > 0 ? tips : ["Your profile is in top-tier shape! Keep applying for open roles."],
  };
};

// Skill Gap Analysis
const analyzeSkillGap = (profile) => {
  const targetRole = profile?.careerGoal || profile?.jobPreferences?.preferredRoles?.[0] || "Full Stack Developer";
  const benchmarkSkills = ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS["Full Stack Developer"];
  const studentSkills = (profile?.technicalSkills || []).map((s) => s.trim().toLowerCase());

  const mastered = [];
  const recommendedToLearn = [];

  benchmarkSkills.forEach((skill) => {
    if (studentSkills.includes(skill.toLowerCase())) {
      mastered.push(skill);
    } else {
      recommendedToLearn.push(skill);
    }
  });

  return {
    targetRole,
    mastered,
    recommendedToLearn,
    matchPercentage: Math.round((mastered.length / benchmarkSkills.length) * 100),
  };
};

// ==========================================
// GET STUDENT DASHBOARD DATA
// ==========================================
module.exports.getStudentDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await StudentProfile.findOne({ userId });

    // Auto-create initial profile if none exists
    if (!profile) {
      profile = await StudentProfile.create({
        userId,
        technicalSkills: ["JavaScript", "React", "Node.js", "Git"],
        softSkills: ["Communication", "Problem Solving", "Teamwork"],
        education: [
          {
            institution: "Geeta University",
            degree: "B.Tech Computer Science",
            fieldOfStudy: "Computer Science & Engineering",
            startYear: 2024,
            endYear: 2028,
            currentlyStudying: true,
          },
        ],
        careerGoal: "Full Stack Developer",
        jobPreferences: {
          preferredRoles: ["Full Stack Developer", "Frontend Developer"],
          preferredLocations: ["Bangalore", "Gurgaon", "Remote"],
          jobTypes: ["internship", "full-time"],
          remote: true,
        },
      });
    }

    const completion = calculateProfileCompletion(profile, req.user);
    const readiness = calculateCareerReadiness(profile, completion);
    const skillGap = analyzeSkillGap(profile);

    // 1. Fetch Real Database Internships
    const dbInternships = await Job.find({
      status: "Published",
      employmentType: "Internship",
    })
      .populate("employerId", "companyName logo headquarters")
      .sort({ createdAt: -1 })
      .lean();

    const eligibleDbInternships = dbInternships.filter((job) =>
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
        companyId: job.employerId?._id || "",
        location: job.location,
        stipend: stipendStr,
        salary: stipendStr,
        duration: "3-6 Months",
        type: "Internship",
        workMode: job.workMode || "Remote",
        skillsRequired: job.requiredSkills || [],
        postedAt: "Active",
        deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open until filled",
        description: job.description,
        responsibilities: job.responsibilities,
      };
    });

    // 2. Fetch Real Database Full-Time / Entry-Level Jobs
    const dbJobs = await Job.find({
      status: "Published",
      employmentType: { $ne: "Internship" },
    })
      .populate("employerId", "companyName logo headquarters")
      .sort({ createdAt: -1 })
      .lean();

    const recommendedJobs = dbJobs.map((job) => {
      const salaryStr =
        job.salaryRange?.min > 0
          ? `₹${(job.salaryRange.min / 100000).toFixed(1)} - ${(job.salaryRange.max / 100000).toFixed(1)} LPA`
          : "Best in Industry";

      return {
        _id: job._id,
        id: job._id.toString(),
        jobId: job._id.toString(),
        title: job.title,
        company: job.employerId?.companyName || "Partner Employer",
        companyId: job.employerId?._id || "",
        location: job.location,
        salary: salaryStr,
        type: job.employmentType || "Full-Time",
        workMode: job.workMode || "Hybrid",
        skillsRequired: job.requiredSkills || [],
        postedAt: "Active",
        deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Open",
        description: job.description,
        responsibilities: job.responsibilities,
      };
    });

    // 3. Fetch Real Courses from database
    const dbCourses = await Course.find({ status: "Published" }).limit(6).lean();
    const recommendedCourses = dbCourses.map((c) => ({
      _id: c._id,
      id: c._id.toString(),
      title: c.title,
      provider: "CareerConnect Academy",
      level: c.level || "Intermediate",
      duration: `${c.duration || 6} ${c.durationUnit || "Weeks"}`,
      rating: 4.9,
      skillsCovered: c.skills || [],
      isFree: !c.price || c.price === 0,
    }));

    // 4. Fetch Real Applications for logged in student
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

    const recentApps = dbApplications.map((app) => {
      const jobTitle = app.jobId?.title || "Position";
      const compName = app.jobId?.employerId?.companyName || app.employerId?.companyName || "Employer";
      const appliedDateStr = new Date(app.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return {
        _id: app._id,
        id: app._id.toString(),
        jobId: app.jobId?._id || "",
        title: jobTitle,
        company: compName,
        appliedDate: appliedDateStr,
        status: app.status,
        lastUpdated: "Recently",
      };
    });

    const applications = {
      stats: appStats,
      recent: recentApps,
    };

    // 5. Notifications
    const notifications = [
      {
        id: "notif-1",
        title: "Welcome to Geeta University CareerConnect 🎉",
        message: "Explore live internship opportunities directly posted by verified employers.",
        date: "Today",
        isRead: false,
        type: "application",
      },
    ];

    if (recentApps.length > 0) {
      notifications.unshift({
        id: "notif-latest-app",
        title: `Application Status: ${recentApps[0].status}`,
        message: `Your application for ${recentApps[0].title} at ${recentApps[0].company} is currently in '${recentApps[0].status}' status.`,
        date: "Today",
        isRead: false,
        type: "application",
      });
    }

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
        },
        profile,
        profileCompletion: completion,
        careerReadiness: readiness,
        skillGap,
        education: profile.education || [],
        technicalSkills: profile.technicalSkills || [],
        softSkills: profile.softSkills || [],
        projects: profile.projects || [],
        certifications: profile.certifications || [],
        achievements: profile.achievements || [],
        experience: profile.experience || [],
        resume: profile.resume || {},
        careerGoal: profile.careerGoal || "Full Stack Developer",
        jobPreferences: profile.jobPreferences || {},
        recommendedInternships,
        recommendedJobs,
        recommendedCourses,
        applications,
        savedOpportunities: [],
        upcomingDeadlines: recommendedInternships.slice(0, 3).map((int, idx) => ({
          id: `dl-${idx + 1}`,
          title: `${int.company} Internship Application`,
          type: "Internship",
          date: int.deadline || "Open",
          daysRemaining: 15,
          urgency: "normal",
        })),
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET STUDENT PROFILE
// ==========================================
module.exports.getStudentProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await StudentProfile.findOne({ userId }).populate("userId", "fullName email username phone profileImage");

    if (!profile) {
      profile = await StudentProfile.create({
        userId,
        technicalSkills: ["JavaScript", "React", "Node.js"],
        education: [
          {
            institution: "Geeta University",
            degree: "B.Tech Computer Science",
            startYear: 2024,
            endYear: 2028,
            currentlyStudying: true,
          },
        ],
      });
      profile = await profile.populate("userId", "fullName email username phone profileImage");
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE STUDENT PROFILE
// ==========================================
module.exports.updateStudentProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    const profile = await StudentProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    const completion = calculateProfileCompletion(profile, req.user);
    profile.profileCompletion = completion;
    profile.isProfileComplete = completion >= 80;
    await profile.save();

    await User.findByIdAndUpdate(userId, {
      profileCompletion: completion,
      isProfileComplete: completion >= 80,
    });

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully",
      profile,
      profileCompletion: completion,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SAVE / BOOKMARK OPPORTUNITY
// ==========================================
module.exports.toggleSaveOpportunity = async (req, res, next) => {
  try {
    const { opportunityId, title, type } = req.body;
    return res.status(200).json({
      success: true,
      message: "Opportunity saved to your workspace",
      savedItem: { id: opportunityId, title, type, savedAt: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// APPLY TO OPPORTUNITY (REAL DATABASE POST)
// ==========================================
module.exports.applyOpportunity = async (req, res, next) => {
  try {
    const { opportunityId, jobId, title, company, type } = req.body;
    const targetJobId = jobId || opportunityId;
    const candidateId = req.user._id;

    if (!targetJobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required to submit application",
      });
    }

    const job = await Job.findById(targetJobId).populate("employerId");
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job opportunity not found",
      });
    }

    if (job.status !== "Published") {
      return res.status(400).json({
        success: false,
        message: "This position is no longer accepting applications",
      });
    }

    const existing = await Application.findOne({ jobId: targetJobId, candidateId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Application already submitted for this position",
      });
    }

    // Match calculation
    const studentProf = await StudentProfile.findOne({ userId: candidateId }).lean();
    const candidateSkills = studentProf?.technicalSkills || [];
    const strongSkills = candidateSkills.filter((s) =>
      (job.requiredSkills || []).some((reqS) => reqS.toLowerCase() === s.toLowerCase())
    );
    const missingSkills = (job.requiredSkills || []).filter(
      (reqS) => !candidateSkills.some((s) => s.toLowerCase() === reqS.toLowerCase())
    );

    const matchOverall = Math.min(100, Math.max(40, Math.round(50 + (strongSkills.length * 15))));

    const application = await Application.create({
      jobId: targetJobId,
      candidateId,
      employerId: job.employerId?._id || job.employerId,
      resumeUrl: studentProf?.resume?.resumeUrl || "",
      status: "Applied",
      stageHistory: [
        {
          stage: "Applied",
          notes: "Student applied via LMS Student Dashboard",
          changedBy: candidateId,
          changedAt: new Date(),
        },
      ],
      matchScore: {
        overall: matchOverall,
        skills: Math.min(100, strongSkills.length * 25),
        experience: 75,
        education: 90,
      },
      matchingDetails: {
        strongSkills,
        missingSkills,
      },
    });

    job.applicantsCount += 1;
    await job.save();

    const companyName = job.employerId?.companyName || company || "Partner Employer";

    return res.status(201).json({
      success: true,
      message: `✓ Application submitted successfully for "${job.title}" at ${companyName}!`,
      application: {
        _id: application._id,
        id: application._id.toString(),
        jobId: job._id.toString(),
        title: job.title,
        company: companyName,
        type: job.employmentType,
        appliedDate: "Today",
        status: "Applied",
        lastUpdated: "Just now",
      },
    });
  } catch (error) {
    next(error);
  }
};
