const User = require("../models/User");
const ProfessionalProfile = require("../models/ProfessionalProfile");

// Skill benchmarks for target senior/executive roles for Skill Gap Analysis
const ROLE_SKILL_BENCHMARKS = {
  "Engineering Lead / Staff Engineer": [
    "System Design", "Microservices", "Cloud Architecture (AWS/GCP)", "Team Leadership",
    "Node.js / Go / Java", "Kubernetes & Docker", "CI/CD & DevOps", "Code Reviews & Mentoring"
  ],
  "Engineering Manager": [
    "People Management", "Agile & Scrum Leadership", "System Architecture", "Hiring & Mentoring",
    "Strategic Roadmapping", "Cross-Functional Collaboration", "Resource Allocation", "Engineering Metrics (DORA)"
  ],
  "Solution Architect / Cloud Architect": [
    "Cloud Architecture (AWS/Azure)", "Distributed Systems", "Security & Compliance", "API Design",
    "High Availability & Disaster Recovery", "Kubernetes", "Database Optimization", "Cost Optimization"
  ],
  "Senior Full Stack Developer": [
    "React", "Node.js", "TypeScript", "System Design", "SQL & NoSQL", "Docker", "REST & GraphQL", "Testing (Jest/Cypress)"
  ],
  "Senior Backend Engineer": [
    "Node.js / Go / Java", "Microservices", "PostgreSQL / MongoDB", "Redis & Caching",
    "Kafka / RabbitMQ", "System Design", "Docker & Kubernetes", "Performance Tuning"
  ],
  "Product Manager (Technical)": [
    "Product Strategy", "Technical Requirements", "Data Analytics & SQL", "User Research",
    "Agile Roadmapping", "Stakeholder Management", "A/B Testing", "Sprint Planning"
  ],
};

// ==========================================
// CALCULATE TOTAL EXPERIENCE FROM RECORDS
// ==========================================
const calculateTotalExperience = (experienceList = []) => {
  if (!experienceList || experienceList.length === 0) {
    return { years: 0, months: 0, category: "1-3 years" };
  }

  let totalMonths = 0;
  const now = new Date();

  experienceList.forEach((exp) => {
    if (!exp.startDate) return;
    const start = new Date(exp.startDate);
    const end = exp.currentlyWorking || !exp.endDate ? now : new Date(exp.endDate);

    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diffMonths > 0) {
      totalMonths += diffMonths;
    }
  });

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  let category = "1-3 years";
  if (years >= 12) category = "12+ years";
  else if (years >= 8) category = "8-12 years";
  else if (years >= 5) category = "5-8 years";
  else if (years >= 3) category = "3-5 years";

  return { years, months, category };
};

// ==========================================
// DYNAMIC PROFILE COMPLETION (Weighted logic)
// ==========================================
const calculateProfessionalProfileCompletion = (profile, user) => {
  let score = 0;

  // 1. Basic Information (10%)
  const hasBasicInfo = !!(
    (user?.fullName || profile?.userId?.fullName) &&
    (user?.email || profile?.userId?.email) &&
    (user?.phone || profile?.userId?.phone || profile?.location?.city)
  );
  if (hasBasicInfo) score += 10;

  // 2. Professional Headline (5%)
  if (profile?.professionalHeadline && profile.professionalHeadline.trim().length >= 10) score += 5;

  // 3. Professional Summary (10%)
  if (profile?.professionalSummary && profile.professionalSummary.trim().length >= 25) score += 10;

  // 4. Current Employment (15%)
  if (
    profile?.currentEmployment?.company &&
    profile?.currentEmployment?.jobTitle &&
    profile?.currentEmployment?.joiningDate
  ) {
    score += 15;
  } else if (profile?.currentEmployment?.company || profile?.currentEmployment?.jobTitle) {
    score += 8;
  }

  // 5. Work Experience History (15%)
  if (profile?.experience && profile.experience.length >= 2) score += 15;
  else if (profile?.experience && profile.experience.length === 1) score += 10;

  // 6. Skills (10%)
  let skillsCount = 0;
  const categories = ["programmingLanguages", "frameworks", "databases", "cloud", "devOps", "tools", "domain", "management", "softSkills", "technical"];
  categories.forEach((cat) => {
    skillsCount += profile?.skills?.[cat]?.length || 0;
  });
  if (skillsCount >= 6) score += 10;
  else if (skillsCount >= 3) score += 6;
  else if (skillsCount > 0) score += 3;

  // 7. Projects (10%)
  if (profile?.projects && profile.projects.length >= 1) score += 10;

  // 8. Achievements & Leadership (10%)
  const hasAchievements = profile?.achievements && profile.achievements.length > 0;
  const hasLeadership = profile?.leadership && profile.leadership.length > 0;
  if (hasAchievements && hasLeadership) score += 10;
  else if (hasAchievements || hasLeadership) score += 6;

  // 9. Certifications & Professional Development (5%)
  const hasCerts = profile?.certifications && profile.certifications.length > 0;
  const hasDev = profile?.professionalDevelopment && profile.professionalDevelopment.length > 0;
  if (hasCerts || hasDev) score += 5;

  // 10. Career Goal & Preferences (5%)
  if (profile?.careerGoal?.targetRole || profile?.jobPreferences?.preferredRoles?.length > 0) score += 5;

  // 11. Resume (5%)
  const hasResume = !!(profile?.resume?.resumeUrl || profile?.resume?.resumeName || profile?.resume?.isGenerated);
  if (hasResume) score += 5;

  return Math.min(100, Math.max(0, score));
};

// ==========================================
// CAREER STRENGTH SCORE (0 - 100) & BREAKDOWN
// ==========================================
const calculateCareerStrengthScore = (profile, completion) => {
  const breakdown = {
    profileStrength: { score: completion, max: 100, weight: 20 },
    experienceDepth: { score: 0, max: 100, weight: 25 },
    skillsBreadth: { score: 0, max: 100, weight: 20 },
    leadershipImpact: { score: 0, max: 100, weight: 15 },
    credentialsResume: { score: 0, max: 100, weight: 10 },
    transitionClarity: { score: 0, max: 100, weight: 10 },
  };

  // Experience Depth
  const totalYrs = profile?.totalExperienceYears || 0;
  const expRecords = profile?.experience?.length || 0;
  let expScore = Math.min(60, totalYrs * 10) + Math.min(40, expRecords * 20);
  breakdown.experienceDepth.score = Math.min(100, expScore);

  // Skills Breadth & Depth (Cloud, DevOps, Architecture, Management)
  const skills = profile?.skills || {};
  let expertCount = 0;
  let advancedCount = 0;
  let strategicSkills = 0;

  const categories = ["programmingLanguages", "frameworks", "databases", "cloud", "devOps", "tools", "domain", "management", "softSkills", "technical"];
  categories.forEach((cat) => {
    (skills[cat] || []).forEach((s) => {
      if (s.proficiency === "Expert") expertCount++;
      if (s.proficiency === "Advanced") advancedCount++;
      if (["cloud", "devOps", "management", "domain"].includes(cat)) strategicSkills++;
    });
  });

  let skillScore = expertCount * 18 + advancedCount * 10 + strategicSkills * 8;
  breakdown.skillsBreadth.score = Math.min(100, skillScore);

  // Leadership & Business Impact
  let leadScore = 0;
  if (profile?.leadership && profile.leadership.length > 0) leadScore += 40;
  if (profile?.achievements && profile.achievements.length > 0) {
    const hasMetrics = profile.achievements.some((a) => a.impact && a.impact.trim().length > 10);
    leadScore += hasMetrics ? 40 : 25;
  }
  if (profile?.projects && profile.projects.length > 0) leadScore += 20;
  breakdown.leadershipImpact.score = Math.min(100, leadScore);

  // Credentials & Resume
  let credScore = 0;
  if (profile?.certifications?.length > 0) credScore += 45;
  if (profile?.resume?.resumeUrl || profile?.resume?.isGenerated) credScore += 45;
  if (profile?.professionalDevelopment?.length > 0) credScore += 10;
  breakdown.credentialsResume.score = Math.min(100, credScore);

  // Career Transition Clarity
  let goalScore = 0;
  if (profile?.careerGoal?.targetRole) goalScore += 40;
  if (profile?.availability?.noticePeriod) goalScore += 30;
  if (profile?.compensation?.expectedMinSalary) goalScore += 30;
  breakdown.transitionClarity.score = Math.min(100, goalScore);

  const totalScore = Math.round(
    breakdown.profileStrength.score * 0.2 +
      breakdown.experienceDepth.score * 0.25 +
      breakdown.skillsBreadth.score * 0.2 +
      breakdown.leadershipImpact.score * 0.15 +
      breakdown.credentialsResume.score * 0.1 +
      breakdown.transitionClarity.score * 0.1
  );

  const tips = [];
  if (expertCount === 0) tips.push("Highlight at least 2 core competencies as 'Expert' proficiency with years of experience.");
  if ((profile?.achievements?.length || 0) === 0) tips.push("Add measurable business impact achievements (e.g. latency reduction, revenue gain, team scaling).");
  if ((profile?.leadership?.length || 0) === 0 && totalYrs >= 4) tips.push("Highlight leadership or mentoring experience to qualify for Lead & Staff roles.");
  if ((profile?.certifications?.length || 0) === 0) tips.push("Add cloud or industry certifications (AWS, Azure, GCP, PMP, CKA) to boost executive credibility.");
  if (!profile?.compensation?.expectedMinSalary) tips.push("Specify your expected compensation band to filter suitable high-growth openings.");
  if (!profile?.availability?.noticePeriod) tips.push("Set your official notice period (e.g. 30 / 60 / 90 Days) for precise recruiter matching.");

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
    tips: tips.length > 0 ? tips : ["Your executive profile is in top-tier shape! You are positioned for high-impact roles."],
  };
};

// Calculate match percentage against a senior job
const calculateJobMatch = (professionalProfile, jobRequiredSkills = [], jobTitle = "") => {
  const allProfileSkills = [];
  const categories = ["programmingLanguages", "frameworks", "databases", "cloud", "devOps", "tools", "management", "technical"];
  categories.forEach((cat) => {
    (professionalProfile?.skills?.[cat] || []).forEach((s) => allProfileSkills.push(s.name.toLowerCase()));
  });

  if (jobRequiredSkills.length === 0) return 90;

  let matched = 0;
  jobRequiredSkills.forEach((reqSkill) => {
    if (allProfileSkills.some((s) => s.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(s))) {
      matched += 1;
    }
  });

  let matchPct = Math.round((matched / jobRequiredSkills.length) * 100);

  // Seniority / target role alignment boost
  if (
    jobTitle &&
    professionalProfile?.careerGoal?.targetRole &&
    professionalProfile.careerGoal.targetRole.toLowerCase().includes(jobTitle.toLowerCase())
  ) {
    matchPct = Math.min(100, matchPct + 10);
  }

  return Math.min(99, Math.max(55, matchPct));
};

// ==========================================
// GET PROFESSIONAL PROFILE
// ==========================================
module.exports.getProfessionalProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await ProfessionalProfile.findOne({ userId }).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    if (!profile) {
      // Auto initialize sensible professional profile template
      profile = await ProfessionalProfile.create({
        userId,
        professionalHeadline: "Senior Full Stack Developer | Distributed Cloud & Web Architecture",
        professionalSummary:
          "Experienced Software Engineer with 4+ years of expertise designing and delivering high-concurrency microservices, scalable frontend systems, and resilient cloud architectures.",
        careerSpecialization: "Full Stack & Distributed Systems",
        currentLevel: "Senior",
        targetLevel: "Lead / Staff",
        currentEmployment: {
          company: "Enterprise Cloud Systems",
          jobTitle: "Senior Software Engineer",
          department: "Platform Engineering",
          employmentType: "Full-time",
          industry: "Information Technology",
          location: "Bangalore",
          workMode: "Hybrid",
          joiningDate: new Date(2022, 5, 1),
          currentlyWorking: true,
          description: "Architecting customer-facing APIs and leading microservices migration.",
          responsibilities: "Leading backend sprint planning, system architecture reviews, and mentoring junior engineers.",
        },
        experience: [
          {
            companyName: "Enterprise Cloud Systems",
            jobTitle: "Senior Software Engineer",
            department: "Platform Engineering",
            employmentType: "Full-time",
            location: "Bangalore",
            workMode: "Hybrid",
            startDate: new Date(2022, 5, 1),
            currentlyWorking: true,
            description: "Led development of core billing and authentication microservices.",
            responsibilities: "Designed REST/GraphQL APIs, reduced server response latency by 35%.",
            achievements: "Spearheaded AWS ECS migration saving $20K monthly cloud costs.",
            technologiesUsed: ["Node.js", "React", "MongoDB", "AWS", "Docker", "Redis"],
            teamSize: 6,
            managerialRole: true,
          },
          {
            companyName: "InnovateX Solutions",
            jobTitle: "Software Engineer",
            department: "Engineering",
            employmentType: "Full-time",
            location: "Pune",
            workMode: "On-site",
            startDate: new Date(2020, 6, 1),
            endDate: new Date(2022, 4, 30),
            currentlyWorking: false,
            description: "Built scalable web interfaces and backend services for e-commerce clients.",
            technologiesUsed: ["React", "Express", "PostgreSQL", "Tailwind CSS"],
            teamSize: 4,
          },
        ],
        totalExperienceYears: 4,
        totalExperienceMonths: 2,
        experienceLevelCategory: "3-5 years",
        skills: {
          programmingLanguages: [
            { name: "JavaScript", proficiency: "Expert", yearsOfExperience: 5 },
            { name: "TypeScript", proficiency: "Expert", yearsOfExperience: 4 },
            { name: "Python", proficiency: "Intermediate", yearsOfExperience: 3 },
          ],
          frameworks: [
            { name: "React", proficiency: "Expert", yearsOfExperience: 5 },
            { name: "Node.js", proficiency: "Expert", yearsOfExperience: 5 },
            { name: "Express", proficiency: "Advanced", yearsOfExperience: 4 },
            { name: "Next.js", proficiency: "Advanced", yearsOfExperience: 3 },
          ],
          databases: [
            { name: "MongoDB", proficiency: "Expert", yearsOfExperience: 5 },
            { name: "PostgreSQL", proficiency: "Advanced", yearsOfExperience: 4 },
            { name: "Redis", proficiency: "Advanced", yearsOfExperience: 3 },
          ],
          cloud: [
            { name: "AWS (S3, EC2, ECS, Lambda)", proficiency: "Advanced", yearsOfExperience: 3 },
            { name: "Docker", proficiency: "Advanced", yearsOfExperience: 4 },
          ],
          devOps: [
            { name: "CI/CD (GitHub Actions)", proficiency: "Advanced", yearsOfExperience: 3 },
            { name: "Kubernetes Basics", proficiency: "Intermediate", yearsOfExperience: 2 },
          ],
          tools: [
            { name: "Git", proficiency: "Expert", yearsOfExperience: 5 },
            { name: "Postman", proficiency: "Expert", yearsOfExperience: 5 },
          ],
          domain: [
            { name: "FinTech & Payments", proficiency: "Advanced", yearsOfExperience: 3 },
            { name: "SaaS Platforms", proficiency: "Expert", yearsOfExperience: 4 },
          ],
          management: [
            { name: "System Architecture", proficiency: "Advanced", yearsOfExperience: 3 },
            { name: "Technical Mentorship", proficiency: "Advanced", yearsOfExperience: 2 },
            { name: "Agile / Scrum Sprint Leadership", proficiency: "Advanced", yearsOfExperience: 3 },
          ],
          softSkills: [
            { name: "Stakeholder Management", proficiency: "Advanced", yearsOfExperience: 4 },
            { name: "Cross-functional Leadership", proficiency: "Advanced", yearsOfExperience: 4 },
          ],
          technical: [],
        },
        careerGoal: {
          goal: "Transition to Engineering Lead / Staff Architect role overseeing high-throughput cloud platforms.",
          targetRole: "Engineering Lead / Staff Engineer",
          targetIndustry: "Information Technology & SaaS",
          targetLevel: "Lead / Staff",
          timeline: "Next 6 Months",
        },
        jobPreferences: {
          preferredRoles: ["Engineering Lead", "Staff Software Engineer", "Senior Backend Architect"],
          industries: ["Fintech & Banking", "SaaS & Enterprise Tech", "AI Platforms"],
          locations: ["Bangalore", "Hyderabad", "Remote (India)"],
          workModes: ["Hybrid", "Remote"],
          employmentTypes: ["Full-time"],
        },
        availability: {
          status: "Employed (Passive / Open)",
          noticePeriod: "30 Days",
        },
        compensation: {
          currentSalary: 24,
          expectedMinSalary: 32,
          expectedMaxSalary: 45,
          currency: "INR (LPA)",
          isCurrentSalaryConfidential: true,
        },
        jobSearchStatus: "Open to Opportunities",
        profileVisibility: "recruiter-only",
      });

      profile = await profile.populate(
        "userId",
        "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
      );
    }

    // Dynamic experience calculation
    const expCalc = calculateTotalExperience(profile.experience);
    profile.totalExperienceYears = expCalc.years;
    profile.totalExperienceMonths = expCalc.months;
    profile.experienceLevelCategory = expCalc.category;

    const completion = calculateProfessionalProfileCompletion(profile, req.user);
    const careerStrength = calculateCareerStrengthScore(profile, completion);

    return res.status(200).json({
      success: true,
      profile,
      profileCompletion: completion,
      careerStrength,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE PROFESSIONAL PROFILE
// ==========================================
module.exports.updateProfessionalProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = { ...req.body };

    // Synchronize basic user fields
    const userUpdateFields = {};
    if (updateData.fullName) userUpdateFields.fullName = updateData.fullName.trim();
    if (updateData.phone !== undefined) userUpdateFields.phone = updateData.phone.trim();
    if (updateData.profileImage !== undefined) userUpdateFields.profileImage = updateData.profileImage;
    if (updateData.socialLinks) {
      userUpdateFields.socialLinks = {
        linkedin: updateData.socialLinks.linkedin || "",
        github: updateData.socialLinks.github || "",
      };
    }

    // Auto-calculate total experience if experience records modified
    if (updateData.experience) {
      const expCalc = calculateTotalExperience(updateData.experience);
      updateData.totalExperienceYears = expCalc.years;
      updateData.totalExperienceMonths = expCalc.months;
      updateData.experienceLevelCategory = expCalc.category;
    }

    let profile = await ProfessionalProfile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    // Calculate updated completion & career strength
    const completion = calculateProfessionalProfileCompletion(profile, req.user);
    const careerStrength = calculateCareerStrengthScore(profile, completion);
    const isComplete = completion >= 75;

    profile.profileCompletion = completion;
    profile.careerStrengthScore = careerStrength.score;
    profile.isProfileComplete = isComplete;
    await profile.save();

    userUpdateFields.profileCompletion = completion;
    userUpdateFields.isProfileComplete = isComplete;

    if (Object.keys(userUpdateFields).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdateFields });
    }

    return res.status(200).json({
      success: true,
      message: "Professional profile updated successfully",
      profile,
      profileCompletion: completion,
      careerStrength,
      isProfileComplete: isComplete,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET PROFESSIONAL DASHBOARD DATA
// ==========================================
module.exports.getProfessionalDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await ProfessionalProfile.findOne({ userId }).populate(
      "userId",
      "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
    );

    if (!profile) {
      profile = await ProfessionalProfile.create({
        userId,
        professionalHeadline: "Senior Software Engineer",
        currentEmployment: {
          company: "Enterprise Cloud Systems",
          jobTitle: "Senior Software Engineer",
          location: "Bangalore",
          workMode: "Hybrid",
        },
      });
      profile = await profile.populate(
        "userId",
        "fullName email username phone profileImage role userType isProfileComplete profileCompletion socialLinks"
      );
    }

    const completion = calculateProfessionalProfileCompletion(profile, req.user);
    const careerStrength = calculateCareerStrengthScore(profile, completion);

    // Curated high-growth executive & senior roles
    const rawJobs = [
      {
        id: "pjob-301",
        title: "Staff Software Engineer - Distributed Systems",
        company: "Stripe",
        location: "Bangalore (Remote / Hybrid)",
        salary: "₹45 - 65 LPA + Equity",
        type: "Full-Time",
        workMode: "Hybrid",
        experienceRequired: "4-7 Years",
        skillsRequired: ["System Design", "Node.js", "AWS", "Microservices", "Kafka"],
        postedAt: "Just now",
        isConfidential: false,
      },
      {
        id: "pjob-302",
        title: "Engineering Lead (Full Stack & Cloud)",
        company: "Razorpay",
        location: "Bangalore",
        salary: "₹50 - 75 LPA",
        type: "Full-Time",
        workMode: "Hybrid",
        experienceRequired: "5+ Years",
        skillsRequired: ["React", "Node.js", "Team Leadership", "System Architecture", "PostgreSQL"],
        postedAt: "1 day ago",
        isConfidential: false,
      },
      {
        id: "pjob-303",
        title: "Senior Backend Architect",
        company: "Atlassian",
        location: "Remote (India)",
        salary: "₹55 - 80 LPA",
        type: "Full-Time",
        workMode: "Remote",
        experienceRequired: "5+ Years",
        skillsRequired: ["Microservices", "Docker", "Kubernetes", "AWS", "System Design"],
        postedAt: "2 days ago",
        isConfidential: false,
      },
      {
        id: "pjob-304",
        title: "Principal Cloud Engineer / Tech Lead",
        company: "Innovaccer (Healthcare Cloud)",
        location: "Noida / Remote",
        salary: "₹48 - 70 LPA",
        type: "Full-Time",
        workMode: "Remote",
        experienceRequired: "6+ Years",
        skillsRequired: ["AWS", "Kubernetes", "Python", "CI/CD", "Distributed Systems"],
        postedAt: "3 days ago",
        isConfidential: false,
      },
    ];

    const recommendedJobs = rawJobs.map((job) => ({
      ...job,
      matchPercentage: calculateJobMatch(profile, job.skillsRequired, job.title),
    }));

    // Applications tracking stats
    const applications = {
      stats: {
        applied: 4,
        underReview: 2,
        shortlisted: 1,
        interview: 1,
        selected: 0,
      },
      recent: [
        {
          id: "papp-1",
          title: "Staff Software Engineer",
          company: "Stripe",
          appliedDate: "26 Aug 2026",
          status: "Interview Scheduled 📅",
        },
        {
          id: "papp-2",
          title: "Engineering Lead",
          company: "Razorpay",
          appliedDate: "20 Aug 2026",
          status: "Under Review",
        },
      ],
    };

    // Saved opportunities
    const savedOpportunities = [
      {
        id: "psave-1",
        title: "Senior Backend Architect",
        company: "Atlassian",
        salary: "₹55 - 80 LPA",
        location: "Remote",
        savedAt: "Yesterday",
      },
    ];

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
        careerStrength,
        recommendedJobs,
        applications,
        savedOpportunities,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET PROFESSIONAL RECOMMENDATIONS (Skill Gap & Transition)
// ==========================================
module.exports.getProfessionalRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await ProfessionalProfile.findOne({ userId });

    const targetRole =
      profile?.careerGoal?.targetRole ||
      profile?.jobPreferences?.preferredRoles?.[0] ||
      "Engineering Lead / Staff Engineer";

    const benchmarkSkills =
      ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS["Engineering Lead / Staff Engineer"];

    const allProfileSkills = [];
    const categories = ["programmingLanguages", "frameworks", "databases", "cloud", "devOps", "tools", "management", "technical"];
    categories.forEach((cat) => {
      (profile?.skills?.[cat] || []).forEach((s) => allProfileSkills.push(s.name.toLowerCase()));
    });

    const mastered = [];
    const skillsToDevelop = [];

    benchmarkSkills.forEach((skill) => {
      if (allProfileSkills.some((s) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
        mastered.push(skill);
      } else {
        skillsToDevelop.push(skill);
      }
    });

    const executiveCourses = [
      {
        id: "exc-1",
        title: "Executive System Design & High Scale Architecture",
        provider: "StaffPlus Academy",
        duration: "6 Weeks",
        rating: 4.95,
        skillsCovered: ["Distributed Systems", "Consensus Algorithms", "High Concurrency"],
      },
      {
        id: "exc-2",
        title: "Engineering Leadership & Strategic People Management",
        provider: "TechLead Masterclass",
        duration: "4 Weeks",
        rating: 4.9,
        skillsCovered: ["Engineering Metrics", "Team Mentorship", "Stakeholder Communication"],
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        targetRole,
        masteredSkills: mastered,
        skillsToDevelop,
        matchPercentage: Math.round((mastered.length / benchmarkSkills.length) * 100),
        recommendedExecutiveCourses: executiveCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET PUBLIC / RECRUITER PROFESSIONAL PROFILE
// ==========================================
module.exports.getPublicProfessionalProfile = async (req, res, next) => {
  try {
    const { usernameOrId } = req.params;

    let user = null;
    if (usernameOrId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(usernameOrId).select("fullName username email profileImage socialLinks userType");
    }
    if (!user) {
      user = await User.findOne({ username: usernameOrId.toLowerCase() }).select(
        "fullName username email profileImage socialLinks userType"
      );
    }

    if (!user || user.userType !== "professional") {
      return res.status(404).json({
        success: false,
        message: "Professional public profile not found",
      });
    }

    const profile = await ProfessionalProfile.findOne({ userId: user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile has not been initialized yet",
      });
    }

    if (profile.profileVisibility === "private") {
      return res.status(403).json({
        success: false,
        message: "This professional profile is private.",
      });
    }

    // Deep copy profile and protect confidential compensation fields
    const safeProfile = profile.toObject();
    if (safeProfile.compensation?.isCurrentSalaryConfidential) {
      delete safeProfile.compensation.currentSalary;
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
        profile: safeProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};
