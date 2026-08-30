// utils/seedJobs.js
const mongoose = require("mongoose");
const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Job = require("../models/Job");

const seedInitialJobs = async () => {
  try {
    const jobCount = await Job.countDocuments();
    if (jobCount > 0) {
      console.log("ℹ️ Jobs already exist, skip seeding.");
      return;
    }

    console.log("🌱 Seeding initial jobs & employers...");

    const companies = [
      {
        slug: "technova",
        companyName: "TechNova Labs",
        industry: "Software & Cloud Services",
        headquarters: { city: "Bangalore", state: "Karnataka", country: "India" },
        website: "https://technovalabs.io",
        email: "hr@technovalabs.io",
      },
      {
        slug: "cloudscale",
        companyName: "CloudScale Systems",
        industry: "Cloud Infrastructure & DevOps",
        headquarters: { city: "Gurugram", state: "Haryana", country: "India" },
        website: "https://cloudscalesystems.com",
        email: "hr@cloudscalesystems.com",
      },
      {
        slug: "razorflow",
        companyName: "RazorFlow Technologies",
        industry: "Fintech & API Infrastructure",
        headquarters: { city: "Bangalore", state: "Karnataka", country: "India" },
        website: "https://razorflow.tech",
        email: "hr@razorflow.tech",
      },
      {
        slug: "nexgen",
        companyName: "NexGen Solutions",
        industry: "Enterprise AI & Full Stack",
        headquarters: { city: "Hyderabad", state: "Telangana", country: "India" },
        website: "https://nexgensolutions.ai",
        email: "hr@nexgensolutions.ai",
      },
      {
        slug: "innovatex",
        companyName: "InnovateX Tech",
        industry: "EdTech & Web Platforms",
        headquarters: { city: "Pune", state: "Maharashtra", country: "India" },
        website: "https://innovatex.tech",
        email: "hr@innovatex.tech",
      },
    ];

    const companyProfiles = [];

    for (const comp of companies) {
      // 1. Unique user per company (userId unique constraint)
      let user = await User.findOne({ email: comp.email });
      if (!user) {
        user = await User.create({
          fullName: comp.companyName,
          email: comp.email,
          password: "password123",
          phone: "9999999999",
          role: "employer",
          userType: "professional", // valid enum
          isEmailVerified: true,
          isProfileComplete: true,
        });
      }

      // 2. One profile per user
      let profile = await EmployerProfile.findOne({ userId: user._id });
      if (!profile) {
        profile = await EmployerProfile.findOne({ companyName: comp.companyName });
      }
      if (!profile) {
        profile = await EmployerProfile.create({
          userId: user._id,
          companyName: comp.companyName,
          officialEmail: comp.email,
          mobile: "9999999999",
          industry: comp.industry,
          companyType: "Private",
          website: comp.website,
          headquarters: comp.headquarters,
          isPublished: true,
          profileCompletion: 70,
        });
      }

      companyProfiles.push({ profile, user });
    }

    const realJobs = [
      {
        employerId: companyProfiles[0].profile._id,
        createdBy: companyProfiles[0].user._id,
        companyName: "TechNova Labs",
        title: "Frontend Developer Intern",
        department: "Engineering",
        employmentType: "Internship",
        workMode: "Remote",
        location: "Remote / Bangalore",
        stipend: "₹25,000/month",
        duration: "3 months",
        salaryRange: { min: 25000, max: 25000, currency: "INR", isNegotiable: false },
        experience: { minYears: 0, maxYears: 1, level: "Fresher / Entry-Level" },
        education: "B.Tech / BCA / MCA",
        eligibility: "B.Tech / BCA 2nd year or above",
        description:
          "Join TechNova Labs as a Frontend Developer Intern to build scalable UIs with React.",
        responsibilities: [
          "Develop React components with Tailwind CSS",
          "Integrate REST APIs",
          "Collaborate with designers and backend engineers",
        ],
        requiredSkills: ["React", "JavaScript", "Tailwind CSS"],
        preferredSkills: ["Redux", "TypeScript"],
        bonusSkills: ["Next.js", "Git"],
        openings: 3,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "Published",
        source: "CareerConnect",
        isExternal: false,
      },
      {
        employerId: companyProfiles[1].profile._id,
        createdBy: companyProfiles[1].user._id,
        companyName: "CloudScale Systems",
        title: "Full Stack Engineer Intern",
        department: "Engineering",
        employmentType: "Internship",
        workMode: "Hybrid",
        location: "Gurugram / Delhi NCR",
        stipend: "₹30,000/month",
        duration: "6 months",
        salaryRange: { min: 30000, max: 30000, currency: "INR", isNegotiable: false },
        experience: { minYears: 0, maxYears: 1, level: "Fresher / Entry-Level" },
        education: "B.Tech / MCA",
        description: "Work on cloud microservices and dashboards at CloudScale Systems.",
        responsibilities: [
          "Build Node.js / Express microservices",
          "Develop React frontends",
          "Implement JWT auth",
        ],
        requiredSkills: ["Node.js", "React", "MongoDB"],
        preferredSkills: ["Express", "TypeScript"],
        bonusSkills: ["Docker", "AWS"],
        openings: 2,
        deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        status: "Published",
        source: "CareerConnect",
        isExternal: false,
      },
      {
        employerId: companyProfiles[2].profile._id,
        createdBy: companyProfiles[2].user._id,
        companyName: "RazorFlow Technologies",
        title: "Backend Development Intern",
        department: "Engineering",
        employmentType: "Internship",
        workMode: "On-site",
        location: "Bangalore",
        stipend: "₹28,000/month",
        duration: "3 months",
        salaryRange: { min: 28000, max: 28000, currency: "INR", isNegotiable: false },
        experience: { minYears: 0, maxYears: 1, level: "Fresher / Entry-Level" },
        education: "B.Tech Computer Science / IT",
        description: "Scale payment workflows at RazorFlow Technologies.",
        responsibilities: [
          "Build REST APIs in Node.js",
          "Optimize SQL queries",
          "Write unit tests",
        ],
        requiredSkills: ["Node.js", "Express", "SQL"],
        preferredSkills: ["PostgreSQL", "Redis"],
        bonusSkills: ["Docker"],
        openings: 4,
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: "Published",
        source: "CareerConnect",
        isExternal: false,
      },
      {
        employerId: companyProfiles[3].profile._id,
        createdBy: companyProfiles[3].user._id,
        companyName: "NexGen Solutions",
        title: "Junior Software Engineer (Campus Hire)",
        department: "Engineering",
        employmentType: "Full-time",
        workMode: "Hybrid",
        location: "Hyderabad",
        salaryRange: { min: 650000, max: 900000, currency: "INR", isNegotiable: true },
        experience: { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
        education: "B.Tech / BE / MCA",
        description: "Enterprise web development at NexGen Solutions.",
        responsibilities: [
          "Develop enterprise web apps",
          "Work on DSA and system design",
          "Code reviews and CI/CD",
        ],
        requiredSkills: ["JavaScript", "Data Structures", "Node.js"],
        preferredSkills: ["Java", "SQL"],
        bonusSkills: ["Kubernetes"],
        openings: 5,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: "Published",
        source: "CareerConnect",
        isExternal: false,
      },
      {
        employerId: companyProfiles[4].profile._id,
        createdBy: companyProfiles[4].user._id,
        companyName: "InnovateX Tech",
        title: "Associate React / Web Developer",
        department: "Engineering",
        employmentType: "Full-time",
        workMode: "Remote",
        location: "Pune / Remote",
        salaryRange: { min: 600000, max: 850000, currency: "INR", isNegotiable: true },
        experience: { minYears: 0, maxYears: 2, level: "Fresher / Entry-Level" },
        education: "Any Graduate / B.Tech",
        description: "Build student-facing products at InnovateX Tech.",
        responsibilities: [
          "Build React / Redux SPAs",
          "Accessibility and cross-browser support",
          "Write clean TypeScript",
        ],
        requiredSkills: ["React", "Redux", "TypeScript"],
        preferredSkills: ["TailwindCSS", "Next.js"],
        bonusSkills: ["Figma"],
        openings: 2,
        deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        status: "Published",
        source: "CareerConnect",
        isExternal: false,
      },
    ];

    await Job.insertMany(realJobs);
    console.log(`✅ Seeded ${realJobs.length} jobs + ${companyProfiles.length} employers.`);
  } catch (error) {
    console.error("❌ Seeding jobs error:", error.message);
    console.error(error);
  }
};

module.exports = seedInitialJobs;