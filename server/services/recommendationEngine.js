const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Course = require("../models/Course");
const Application = require("../models/Application");
const FresherProfile = require("../models/FresherProfile");
const User = require("../models/User");

// Industry standard baseline skill matrix by role
const ROLE_SKILL_BENCHMARKS = {
  "Full Stack Developer": [
    "JavaScript",
    "React",
    "Node.js",
    "Express.js",
    "MongoDB",
    "REST APIs",
    "Git",
    "HTML5/CSS3",
    "SQL",
    "TypeScript",
  ],
  "Frontend Developer": [
    "JavaScript",
    "React",
    "HTML5/CSS3",
    "Tailwind CSS",
    "TypeScript",
    "Redux",
    "Git",
    "REST APIs",
    "Responsive Design",
  ],
  "Backend Developer": [
    "Node.js",
    "Express.js",
    "MongoDB",
    "SQL",
    "REST APIs",
    "PostgreSQL",
    "Docker",
    "Authentication (JWT)",
    "Git",
    "System Design Basics",
  ],
  "MERN Stack Developer": [
    "MongoDB",
    "Express.js",
    "React",
    "Node.js",
    "JavaScript",
    "REST APIs",
    "Git",
    "JWT Authentication",
  ],
  "Java Developer": [
    "Java",
    "Spring Boot",
    "Hibernate",
    "SQL",
    "REST APIs",
    "Git",
    "Microservices Basics",
    "Maven",
  ],
  "Python Developer": [
    "Python",
    "Django",
    "FastAPI",
    "SQL",
    "REST APIs",
    "Git",
    "Pandas",
    "PostgreSQL",
  ],
  "Data Analyst": [
    "Python",
    "SQL",
    "Excel",
    "Power BI",
    "Tableau",
    "Pandas",
    "Data Visualization",
    "Statistics",
  ],
  "Software Engineer": [
    "Data Structures",
    "Algorithms",
    "JavaScript",
    "Java",
    "SQL",
    "Git",
    "Problem Solving",
    "OOP",
  ],
  "DevOps Engineer": [
    "Linux",
    "Docker",
    "Kubernetes",
    "CI/CD",
    "AWS",
    "Git",
    "Shell Scripting",
    "Terraform",
  ],
  "Mobile App Developer": [
    "React Native",
    "Flutter",
    "JavaScript",
    "Dart",
    "Mobile UI/UX",
    "REST APIs",
    "Git",
  ],
};

// Skill Importance / Why it matters descriptions
const SKILL_INSIGHTS = {
  "Node.js": "Crucial for building scalable, high-throughput backend services and REST APIs.",
  "Express.js": "Standard lightweight routing and middleware framework used across modern web stacks.",
  Express: "Standard lightweight routing and middleware framework used across modern web stacks.",
  React: "The most requested component-driven frontend library across industry tech teams.",
  MongoDB: "Dominant NoSQL database powering modern flexible cloud applications.",
  SQL: "Essential for transactional integrity, analytical reporting, and enterprise systems.",
  "REST APIs": "Standard client-server architectural communication pattern for modern web & mobile apps.",
  TypeScript: "Dramatically improves codebase reliability and developer productivity in production.",
  Git: "Universal collaboration and version control standard expected by every hiring team.",
  Docker: "Enables consistent environments across development and production deployments.",
  "JWT Authentication": "Standard secure token-based user authorization mechanism.",
  "Spring Boot": "Enterprise-grade Java framework for robust microservices.",
  Python: "High versatility across web backends, data engineering, and automation.",
  "Power BI": "Leading business intelligence platform for executive interactive reporting.",
  "Data Structures": "Core evaluation criteria for algorithmic interview rounds.",
  "Tailwind CSS": "Modern utility-first CSS standard for rapid responsive design.",
  Redux: "Predictable state management pattern for large-scale single page apps.",
};

// Curated Project Archetypes designed to fill fresher skill gaps
const PROJECT_ARCHETYPES = [
  {
    id: "proj-rec-1",
    targetRole: "Full Stack Developer",
    title: "Full-Stack Collaborative Project Management Hub",
    description: "Build a Trello-like real-time kanban application with drag-and-drop, team workspaces, activity logs, and JWT role-based authorization.",
    skillsCovered: ["React", "Node.js", "Express.js", "MongoDB", "REST APIs", "Socket.io"],
    difficulty: "Intermediate",
    estimatedHours: "20-25 hrs",
    whyRecommended: "Bridges the gap between basic frontend prototypes and production-ready full stack architecture with real-time events.",
    keyDeliverables: [
      "JWT auth with refresh tokens",
      "CRUD operations on boards, lists, and cards",
      "Real-time updates across multiple active user tabs",
      "Responsive UI with Tailwind CSS",
    ],
  },
  {
    id: "proj-rec-2",
    targetRole: "Backend Developer",
    title: "Scalable E-Commerce Micro-Services REST API",
    description: "Design an API with product cataloging, cart checkout, payment webhook verification, Redis caching, and rate limiting.",
    skillsCovered: ["Node.js", "Express.js", "MongoDB", "Redis", "JWT Authentication", "Docker"],
    difficulty: "Intermediate to Advanced",
    estimatedHours: "25-30 hrs",
    whyRecommended: "Demonstrates backend depth, caching, database indexing, and enterprise security practices recruiters look for.",
    keyDeliverables: [
      "Role-based access (Customer vs Admin)",
      "Redis query caching for popular products",
      "Automated Swagger/Postman API documentation",
      "Dockerized development container",
    ],
  },
  {
    id: "proj-rec-3",
    targetRole: "Frontend Developer",
    title: "Interactive Analytics Dashboard with Theme Switching",
    description: "Build a data-dense metrics dashboard featuring customizable chart widgets, live filtering, dark/light theme, and optimistic UI updates.",
    skillsCovered: ["React", "TypeScript", "Tailwind CSS", "Recharts", "Redux Toolkit"],
    difficulty: "Intermediate",
    estimatedHours: "15-20 hrs",
    whyRecommended: "Provides strong evidence of component modularity, state management, and visual polish.",
    keyDeliverables: [
      "Dynamic data filtering by date and category",
      "Recharts / Chart.js integration",
      "Persistent user preferences in local storage",
      "Accessible keyboard navigation (WCAG 2.1)",
    ],
  },
  {
    id: "proj-rec-4",
    targetRole: "Data Analyst",
    title: "End-to-End Customer Churn Prediction & BI Dashboard",
    description: "Clean real-world telecom dataset, conduct exploratory data analysis, and build an interactive PowerBI / Tableau dashboard with actionable retention strategies.",
    skillsCovered: ["Python", "Pandas", "SQL", "Power BI", "Data Visualization"],
    difficulty: "Beginner to Intermediate",
    estimatedHours: "15-18 hrs",
    whyRecommended: "Directly showcases the data pipeline lifecycle from raw ingestion to business decision insights.",
    keyDeliverables: [
      "Jupyter notebook with EDA and statistical insights",
      "SQL scripts for aggregation and cohort analysis",
      "Interactive Power BI executive presentation dashboard",
    ],
  },
];

/**
 * Extract all normalized user skills as lowercase string list
 */
const extractUserSkills = (profile) => {
  const skillList = [];
  const skillDetails = [];
  const categories = [
    "programmingLanguages",
    "frameworks",
    "databases",
    "tools",
    "technical",
    "softSkills",
  ];

  categories.forEach((cat) => {
    (profile?.skills?.[cat] || []).forEach((s) => {
      if (s && s.name) {
        skillList.push(s.name.trim().toLowerCase());
        skillDetails.push({
          name: s.name.trim(),
          proficiency: s.proficiency || "Intermediate",
          category: cat,
        });
      }
    });
  });

  (profile?.primarySkills || []).forEach((s) => {
    if (s && !skillList.includes(s.toLowerCase())) {
      skillList.push(s.trim().toLowerCase());
      skillDetails.push({
        name: s.trim(),
        proficiency: "Intermediate",
        category: "primary",
      });
    }
  });

  return { skillList, skillDetails };
};

/**
 * Calculate multi-factor match score between Fresher profile and a Job opening
 */
const calculateJobScore = (profile, userSkills, job) => {
  let score = 0;
  const reasons = [];
  const matchingSkills = [];
  const missingSkills = [];

  const targetRole = (profile?.targetRole || profile?.jobPreferences?.preferredRoles?.[0] || "").toLowerCase();
  const jobTitle = (job.title || "").toLowerCase();
  const jobCategory = (job.category || "").toLowerCase();

  // 1. Role Match (25 pts)
  if (targetRole && (jobTitle.includes(targetRole) || targetRole.includes(jobTitle) || jobCategory.includes(targetRole))) {
    score += 25;
    reasons.push(`Job title matches your target role "${profile.targetRole}"`);
  } else if (targetRole && (jobTitle.includes("developer") || jobTitle.includes("engineer") || jobTitle.includes("analyst"))) {
    score += 15;
  } else {
    score += 10;
  }

  // 2. Skills Match (40 pts)
  const jobRequired = (job.requiredSkills || []).map((s) => s.trim());
  const jobPreferred = (job.preferredSkills || []).map((s) => s.trim());
  const allJobSkills = [...jobRequired, ...jobPreferred];

  if (allJobSkills.length > 0) {
    let matchedCount = 0;
    allJobSkills.forEach((reqSkill) => {
      const isMatch = userSkills.some((uSkill) =>
        uSkill.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(uSkill)
      );
      if (isMatch) {
        matchedCount++;
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });

    const skillRatio = matchedCount / allJobSkills.length;
    const skillScore = Math.round(skillRatio * 40);
    score += skillScore;

    if (matchingSkills.length > 0) {
      reasons.push(`You match ${matchingSkills.length} required skill${matchingSkills.length > 1 ? "s" : ""} (${matchingSkills.slice(0, 3).join(", ")})`);
    }
  } else {
    // Default credit if job didn't specify granular skills
    score += 30;
  }

  // 3. Experience Match (15 pts) - Fresher Friendly
  const minExp = job.experience?.minYears ?? 0;
  const maxExp = job.experience?.maxYears ?? 2;
  const expLevel = (job.experience?.level || "").toLowerCase();

  if (minExp === 0 || expLevel.includes("fresher") || expLevel.includes("entry")) {
    score += 15;
    reasons.push("Open to Freshers and Entry-Level candidates (0–2 yrs)");
  } else if (minExp <= 1) {
    score += 10;
  } else {
    score += 5;
  }

  // 4. Work Mode Match (10 pts)
  const prefWorkModes = profile?.jobPreferences?.workMode || ["Remote", "Hybrid", "On-site", "Any"];
  const jobWorkMode = job.workMode || "Hybrid";

  if (prefWorkModes.includes("Any") || prefWorkModes.includes(jobWorkMode)) {
    score += 10;
    reasons.push(`${jobWorkMode} aligns with your preferred work mode`);
  } else {
    score += 5;
  }

  // 5. Location Match (10 pts)
  const prefLocations = (profile?.jobPreferences?.preferredLocations || []).map((l) => l.toLowerCase());
  const userCity = (profile?.location?.city || "").toLowerCase();
  const jobLocation = (job.location || job.city || "").toLowerCase();

  if (jobWorkMode === "Remote" || prefLocations.some((loc) => jobLocation.includes(loc)) || (userCity && jobLocation.includes(userCity))) {
    score += 10;
    if (jobWorkMode === "Remote") {
      reasons.push("Remote position accessible from anywhere");
    } else {
      reasons.push(`Located in ${job.city || job.location}, matching your location preference`);
    }
  } else {
    score += 5;
  }

  const finalMatchScore = Math.min(98, Math.max(45, score));

  return {
    matchScore: finalMatchScore,
    matchingSkills,
    missingSkills,
    reasons,
  };
};

/**
 * Main Engine: Generate Full Recommendation Suite for Fresher
 */
const generateFresherRecommendations = async (userId) => {
  // 1. Fetch User and Fresher Profile
  const user = await User.findById(userId).select("fullName username email phone profileImage userType");
  let profile = await FresherProfile.findOne({ userId });

  if (!profile) {
    profile = await FresherProfile.create({
      userId,
      targetRole: "Full Stack Developer",
    });
  }

  const { skillList, skillDetails } = extractUserSkills(profile);
  const targetRole = profile.targetRole || profile.jobPreferences?.preferredRoles?.[0] || "Full Stack Developer";

  // 2. Fetch User's existing applications to avoid redundant job recommendations
  const userApplications = await Application.find({ candidateId: userId }).select("jobId internshipId status opportunityTitle companyName createdAt");
  const appliedJobIds = new Set(
    userApplications.filter((a) => a.jobId).map((a) => a.jobId.toString())
  );
  const appliedInternshipIds = new Set(
    userApplications.filter((a) => a.internshipId).map((a) => a.internshipId.toString())
  );

  // 3. Fetch Active Published Jobs & calculate dynamic skill demand
  const activeJobs = await Job.find({ status: "Published" })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(50)
    .lean();

  // Calculate live market skill frequency for this target role
  const roleKeywords = targetRole.toLowerCase().split(" ");
  const targetRoleJobs = activeJobs.filter((j) => {
    const title = (j.title || "").toLowerCase();
    const cat = (j.category || "").toLowerCase();
    return roleKeywords.some((k) => title.includes(k) || cat.includes(k));
  });

  const relevantJobPool = targetRoleJobs.length >= 3 ? targetRoleJobs : activeJobs;
  const skillFrequency = {};
  relevantJobPool.forEach((job) => {
    [...(job.requiredSkills || []), ...(job.preferredSkills || [])].forEach((skill) => {
      const clean = skill.trim();
      if (clean) {
        skillFrequency[clean] = (skillFrequency[clean] || 0) + 1;
      }
    });
  });

  // 4. Benchmarks & Skill Gap Analysis
  const benchmarkSkills = ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS["Full Stack Developer"];
  const userSkillSet = new Set(skillList);

  const masteredSkills = [];
  const missingSkillsList = [];

  benchmarkSkills.forEach((bSkill) => {
    const isMastered = userSkillSet.has(bSkill.toLowerCase()) || skillList.some((s) => s.includes(bSkill.toLowerCase()));
    if (isMastered) {
      masteredSkills.push(bSkill);
    } else {
      // Calculate dynamic demand percentage from current job pool
      const jobCountWithSkill = skillFrequency[bSkill] || 0;
      const demandPct = relevantJobPool.length > 0
        ? Math.round((jobCountWithSkill / relevantJobPool.length) * 100)
        : 65;
      
      const priority = demandPct >= 50 ? "High" : demandPct >= 25 ? "Medium" : "Low";
      const reason = SKILL_INSIGHTS[bSkill] || `Required by ${demandPct > 0 ? demandPct + "%" : "top"} entry-level ${targetRole} positions.`;

      missingSkillsList.push({
        skill: bSkill,
        priority,
        demandPercentage: Math.max(35, demandPct),
        reason,
        jobsRequiringCount: jobCountWithSkill,
        learningActionUrl: `/courses?search=${encodeURIComponent(bSkill)}`,
      });
    }
  });

  // Sort missing skills by priority (High -> Medium -> Low) and demand
  missingSkillsList.sort((a, b) => b.demandPercentage - a.demandPercentage);

  // 5. Job Recommendations with Dynamic Scoring
  const recommendedJobs = activeJobs
    .filter((job) => !appliedJobIds.has(job._id.toString()))
    .map((job) => {
      const matchAnalysis = calculateJobScore(profile, skillList, job);
      return {
        _id: job._id,
        id: job._id,
        title: job.title,
        company: job.companyName || "Technology Partner",
        location: job.location || `${job.city || "Bangalore"}, ${job.country || "India"}`,
        city: job.city || "Bangalore",
        workMode: job.workMode || "Hybrid",
        salary: job.salaryRange?.min
          ? `₹${job.salaryRange.min / 100000}–${job.salaryRange.max / 100000} LPA`
          : "Competitive (Fresher Scale)",
        experience: `${job.experience?.minYears || 0}–${job.experience?.maxYears || 2} Years (Entry Level)`,
        requiredSkills: job.requiredSkills || [],
        matchingSkills: matchAnalysis.matchingSkills,
        missingSkills: matchAnalysis.missingSkills,
        matchScore: matchAnalysis.matchScore,
        reasons: matchAnalysis.reasons,
        postedDate: job.createdAt,
        deadline: job.deadline || null,
        openings: job.openings || 1,
        source: job.source || "CareerConnect Verified",
        employmentType: job.employmentType || "Full-time",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  // 6. Internship Recommendations
  const activeInternships = await Internship.find({ status: "Published" })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const recommendedInternships = activeInternships
    .filter((internship) => !appliedInternshipIds.has(internship._id.toString()))
    .map((internship) => {
      const reqSkills = internship.requiredSkills || [];
      const matching = reqSkills.filter((s) => userSkillSet.has(s.toLowerCase()));
      const matchScore = Math.min(
        95,
        Math.max(50, Math.round((matching.length / Math.max(1, reqSkills.length)) * 50 + 45))
      );

      return {
        _id: internship._id,
        id: internship._id,
        title: internship.title,
        company: internship.companyName || "Enterprise Partner",
        location: internship.location || "Remote",
        workMode: internship.workMode || "Remote",
        stipend: internship.stipend || "Paid Stipend",
        duration: internship.duration || "3 Months",
        requiredSkills: reqSkills,
        matchingSkills: matching,
        matchScore,
        deadline: internship.deadline,
        type: "Internship",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  // 7. Course Recommendations from DB
  const activeCourses = await Course.find({ status: "Published" }).limit(20).lean();
  let recommendedCourses = [];

  if (activeCourses.length > 0) {
    recommendedCourses = activeCourses
      .map((c) => {
        const topMissing = missingSkillsList[0]?.skill;
        const teachesMissing = (c.skills || []).some((s) =>
          missingSkillsList.some((m) => m.skill.toLowerCase() === s.toLowerCase())
        );

        return {
          _id: c._id,
          id: c._id,
          title: c.title,
          provider: "CareerConnect Academy",
          duration: `${c.duration || 4} ${c.durationUnit || "weeks"}`,
          difficulty: c.level ? c.level.charAt(0).toUpperCase() + c.level.slice(1) : "Beginner",
          skillsCovered: c.skills || [],
          careerRelevance: teachesMissing
            ? `Recommended to close high-priority skill gap in ${c.skills?.join(", ")}`
            : `Strengthens core ${targetRole} foundation`,
          rating: 4.8,
          url: `/courses/${c._id}`,
          thumbnail: c.thumbnail || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
          teachesMissing,
        };
      })
      .sort((a, b) => (b.teachesMissing ? 1 : 0) - (a.teachesMissing ? 1 : 0))
      .slice(0, 4);
  }

  // Fallback courses if DB Course collection is sparse
  if (recommendedCourses.length < 3) {
    const topMissingSkill = missingSkillsList[0]?.skill || "Node.js";
    const secondMissingSkill = missingSkillsList[1]?.skill || "Express.js";

    recommendedCourses.push(
      {
        id: "crs-rec-1",
        title: `Industry-Ready ${targetRole} FastTrack & ${topMissingSkill}`,
        provider: "CareerConnect Pro Learning",
        duration: "4 Weeks (Self-paced)",
        difficulty: "Intermediate",
        skillsCovered: [topMissingSkill, secondMissingSkill, "REST APIs"],
        careerRelevance: `Directly targets your highest-demand missing skill: ${topMissingSkill}`,
        rating: 4.9,
        url: `/courses?search=${encodeURIComponent(topMissingSkill)}`,
        thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=60",
      },
      {
        id: "crs-rec-2",
        title: "Cracking Technical Interviews: Algorithms & Data Structures",
        provider: "AlgoPrep Matrix",
        duration: "6 Weeks",
        difficulty: "Beginner to Intermediate",
        skillsCovered: ["Data Structures", "Problem Solving", "System Basics"],
        careerRelevance: "Essential for clearing fresher technical screenings and online assessments",
        rating: 4.8,
        url: "/courses?search=algorithms",
        thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60",
      },
      {
        id: "crs-rec-3",
        title: `Modern Production Web Architecture with ${topMissingSkill}`,
        provider: "TechBridge Institute",
        duration: "3 Weeks",
        difficulty: "Intermediate",
        skillsCovered: [topMissingSkill, "Databases", "Authentication"],
        careerRelevance: `Required by over 60% of open ${targetRole} positions`,
        rating: 4.7,
        url: `/courses?search=${encodeURIComponent(topMissingSkill)}`,
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60",
      }
    );
  }

  // 8. Project Recommendations based on user's current project portfolio
  const existingProjects = profile.projects || [];
  const projectTechsUsed = new Set();
  existingProjects.forEach((p) => {
    (p.technologies || []).forEach((t) => projectTechsUsed.add(t.toLowerCase()));
  });

  const recommendedProjects = PROJECT_ARCHETYPES.map((archetype) => {
    const helpsCloseGaps = archetype.skillsCovered.filter((s) => !userSkillSet.has(s.toLowerCase()));
    let tailoredWhy = archetype.whyRecommended;
    if (existingProjects.length === 0) {
      tailoredWhy = `You currently have 0 projects on your profile. Building this project gives direct proof of practical ${archetype.skillsCovered.slice(0, 3).join(", ")} skills.`;
    } else if (helpsCloseGaps.length > 0) {
      tailoredWhy = `Your current projects demonstrate good fundamentals, but lack evidence of ${helpsCloseGaps.slice(0, 2).join(" & ")}. This project directly fills that gap.`;
    }

    return {
      ...archetype,
      skillsClosing: helpsCloseGaps,
      tailoredWhy,
      actionUrl: "/fresher/profile?tab=projects",
    };
  }).slice(0, 3);

  // 9. Resume & Profile Recommendations
  const resumeRecommendations = [];
  const hasResume = !!(profile.resume?.resumeUrl || profile.resume?.resumeName || profile.resume?.isGenerated);

  if (!hasResume) {
    resumeRecommendations.push({
      id: "res-rec-1",
      priority: "High Priority",
      title: "Upload or Generate Your Fresher Resume",
      description: "Recruiters are 4x more likely to shortlist candidates with an attached PDF resume.",
      actionLabel: "Build Resume",
      actionUrl: "/resume-builder",
    });
  }

  if (existingProjects.length < 2) {
    resumeRecommendations.push({
      id: "res-rec-2",
      priority: "High Priority",
      title: "Add at least 2 full project case studies",
      description: "Include GitHub links and live deployment URLs so recruiters can inspect your clean code.",
      actionLabel: "Add Projects",
      actionUrl: "/fresher/profile",
    });
  }

  if (!profile.socialLinks?.github && !profile.codingProfiles?.some((c) => c.platform === "GitHub")) {
    resumeRecommendations.push({
      id: "res-rec-3",
      priority: "Medium Priority",
      title: "Link your GitHub and LeetCode / HackerRank handles",
      description: "Adding verified coding profiles boosts recruiter trust by 65% for technical evaluations.",
      actionLabel: "Connect Accounts",
      actionUrl: "/fresher/profile",
    });
  }

  if (missingSkillsList.length > 0) {
    resumeRecommendations.push({
      id: "res-rec-4",
      priority: "Medium Priority",
      title: `Add ${missingSkillsList[0].skill} to your skills once practiced`,
      description: `Your target role is ${targetRole}, but your profile has limited evidence of ${missingSkillsList[0].skill}.`,
      actionLabel: "Learn & Add Skill",
      actionUrl: `/courses?search=${encodeURIComponent(missingSkillsList[0].skill)}`,
    });
  }

  // 10. Multi-Pathway Career Recommendations
  const careerPaths = [
    {
      id: "path-1",
      roleTitle: targetRole,
      fitLevel: masteredSkills.length >= 4 ? "Strong Match" : "Good Starting Fit",
      fitPercentage: Math.min(94, Math.round((masteredSkills.length / Math.max(1, benchmarkSkills.length)) * 100 + 20)),
      description: `Direct trajectory for entering ${targetRole} positions across startups and product enterprises.`,
      requiredSkills: benchmarkSkills,
      masteredSkills,
      skillsToDevelop: missingSkillsList.map((m) => m.skill).slice(0, 4),
      salaryRange: "₹4.5 – ₹9.0 LPA (Fresher Average)",
      activeJobsCount: relevantJobPool.length,
    },
    {
      id: "path-2",
      roleTitle: targetRole.includes("Full Stack") ? "Frontend Developer" : "Full Stack Developer",
      fitLevel: "High Flexibility",
      fitPercentage: 82,
      description: "Adjacent high-growth engineering trajectory sharing overlapping frontend/backend fundamentals.",
      requiredSkills: ROLE_SKILL_BENCHMARKS[targetRole.includes("Full Stack") ? "Frontend Developer" : "Full Stack Developer"] || benchmarkSkills,
      masteredSkills: masteredSkills.slice(0, 4),
      skillsToDevelop: ["TypeScript", "Next.js", "State Optimization"],
      salaryRange: "₹4.0 – ₹8.5 LPA",
      activeJobsCount: Math.max(5, activeJobs.length),
    },
    {
      id: "path-3",
      roleTitle: "Software Development Engineer in Test (SDET)",
      fitLevel: "Emerging Alternative",
      fitPercentage: 74,
      description: "Combines development logic with automation, API testing, and CI/CD pipelines with rapid hiring cycles.",
      requiredSkills: ["JavaScript", "Python", "Selenium", "Postman", "Jest", "Git"],
      masteredSkills: masteredSkills.filter((s) => ["javascript", "python", "git"].includes(s.toLowerCase())),
      skillsToDevelop: ["Automated Testing", "Cypress/Selenium", "CI Pipelines"],
      salaryRange: "₹4.0 – ₹7.5 LPA",
      activeJobsCount: 12,
    },
  ];

  // 11. Application-Based Intelligence
  const applicationInsights = {
    totalApplications: userApplications.length,
    underReviewCount: userApplications.filter((a) => a.status === "Under Review" || a.status === "Applied").length,
    shortlistedCount: userApplications.filter((a) => a.status === "Shortlisted" || a.status === "Interview").length,
    insights: [],
  };

  if (userApplications.length === 0) {
    applicationInsights.insights.push({
      type: "tip",
      title: "No applications submitted yet",
      message: "Browse your top recommended jobs below and submit your first application today to kickstart your pipeline.",
    });
  } else {
    applicationInsights.insights.push({
      type: "analysis",
      title: `You have applied to ${userApplications.length} opportunities`,
      message: `Most active ${targetRole} positions evaluate candidates within 3-5 business days. Focus on jobs matching over 80% of your skillset.`,
    });
    if (missingSkillsList.length > 0) {
      applicationInsights.insights.push({
        type: "recommendation",
        title: `Strengthen ${missingSkillsList[0].skill} to boost shortlist rates`,
        message: `Analysis of your target roles indicates ${missingSkillsList[0].skill} is frequently requested by hiring managers.`,
      });
    }
  }

  // 12. Personalized 30-Day Action Plan
  const topSkill1 = missingSkillsList[0]?.skill || "Node.js & Express";
  const topSkill2 = missingSkillsList[1]?.skill || "Database & REST APIs";

  const actionPlan = {
    title: `30-Day Blueprint to Land Your First ${targetRole} Role`,
    timeline: [
      {
        week: "Week 1",
        focus: `Master Core Fundamentals (${topSkill1})`,
        tasks: [
          `Complete online module on ${topSkill1}`,
          "Set up development environment & build basic hello-world APIs",
          "Practice 10 targeted coding questions on problem solving",
        ],
        status: "In Progress",
      },
      {
        week: "Week 2",
        focus: `Build Practical Backend & Data Integration (${topSkill2})`,
        tasks: [
          `Implement ${recommendedProjects[0]?.title || "Full Stack Application"}`,
          "Connect database schema and write CRUD endpoints",
          "Add JWT token authentication for protected routes",
        ],
        status: "Pending",
      },
      {
        week: "Week 3",
        focus: "Project Deployment & Code Quality",
        tasks: [
          "Deploy live application on Vercel / Render / AWS",
          "Add comprehensive README with system architecture & screenshots",
          "Refactor codebase for clean modular structure and error handling",
        ],
        status: "Pending",
      },
      {
        week: "Week 4",
        focus: "Resume Upgrade & Targeted Applications",
        tasks: [
          "Add newly deployed project and metrics to CareerConnect profile & resume",
          "Apply to top 5 high-match (85%+) Fresher positions",
          "Follow up on pending applications and practice mock technical interviews",
        ],
        status: "Pending",
      },
    ],
  };

  // 13. Top Overall Recommendation
  const topOverallMatch = {
    roleTitle: targetRole,
    matchScore: Math.min(94, Math.round((masteredSkills.length / Math.max(1, benchmarkSkills.length)) * 100 + 20)),
    reasons: [
      `${masteredSkills.slice(0, 3).join(", ") || "Your core skills"} match entry requirements for ${targetRole}`,
      `${profile.education?.[0]?.degree || "Your degree"} provides strong eligibility for technology roles`,
      `${existingProjects.length > 0 ? "You have project evidence in your portfolio" : "Eligible for entry-level fresher hiring programs"}`,
      `Matches your preference for ${profile.jobPreferences?.workMode?.join(" / ") || "Remote / Hybrid"} opportunities`,
    ],
    missingSkills: missingSkillsList.slice(0, 2).map((m) => m.skill),
  };

  // Compact Summary for Top Section
  const careerSummary = {
    targetRole,
    experienceLevel: "Fresher (0–1 Year)",
    preferredLocations: profile.jobPreferences?.preferredLocations?.length > 0
      ? profile.jobPreferences.preferredLocations.join(", ")
      : "Remote / Pan-India",
    workMode: profile.jobPreferences?.workMode?.length > 0
      ? profile.jobPreferences.workMode.join(" / ")
      : "Remote / Hybrid",
    topSkills: masteredSkills.length > 0 ? masteredSkills.slice(0, 5) : ["Add Skills"],
    careerGoal: profile.careerGoal || "Get my first full-time job",
    profileCompleteness: profile.profileCompletion || 65,
    lastUpdated: new Date().toISOString(),
  };

  return {
    careerSummary,
    topOverallMatch,
    recommendedJobs,
    skillGapAnalysis: {
      targetRole,
      masteredSkills,
      missingSkills: missingSkillsList,
      totalBenchmarksCount: benchmarkSkills.length,
    },
    recommendedCourses,
    recommendedProjects,
    resumeRecommendations,
    careerPaths,
    recommendedInternships,
    applicationInsights,
    actionPlan,
  };
};

module.exports = {
  generateFresherRecommendations,
  ROLE_SKILL_BENCHMARKS,
};
