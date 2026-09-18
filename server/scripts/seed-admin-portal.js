require("dotenv").config();
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Report = require("../models/Report");

async function seedAdminPortal() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for Admin Portal Seeding...");

  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD or SEED_ADMIN_PASSWORD must be configured in environment variables.");
  }

  // 1. Companies (Tenants)
  let techCorp = await Company.findOne({ name: "TechCorp Global" });
  if (!techCorp) {
    techCorp = await Company.create({
      name: "TechCorp Global",
      description: "Global enterprise technology solutions & enterprise software development.",
      email: "contact@techcorp.com",
      phone: "+91 9876543210",
      website: "https://techcorp.com",
      industry: "Enterprise Software",
      location: "Bangalore, India",
      status: "active",
      settings: { emailNotifications: true, autoShortlist: true },
    });
    console.log("--> Created Company: TechCorp Global");
  }

  let innovateLabs = await Company.findOne({ name: "Innovate Labs" });
  if (!innovateLabs) {
    innovateLabs = await Company.create({
      name: "Innovate Labs",
      description: "AI research and next-generation product design laboratory.",
      email: "hello@innovatelabs.ai",
      phone: "+91 9123456780",
      website: "https://innovatelabs.ai",
      industry: "Artificial Intelligence",
      location: "Gurugram, India",
      status: "active",
      settings: { emailNotifications: true, autoShortlist: false },
    });
    console.log("--> Created Company: Innovate Labs");
  }

  // 2. Super Admin Account
  const superAdminEmail = "superadmin@careerconnect.com";
  let superAdmin = await User.findOne({ email: superAdminEmail });
  if (!superAdmin) {
    superAdmin = await User.create({
      fullName: "Platform Super Admin",
      username: "superadmin",
      email: superAdminEmail,
      password: adminPassword,
      role: "SUPER_ADMIN",
      userType: "admin",
      companyId: null,
      phone: "9998887770",
      countryCode: "+91",
      status: "active",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
      hasPassword: true,
    });
    console.log(`--> Created SUPER_ADMIN: ${superAdminEmail}`);
  } else {
    superAdmin.role = "SUPER_ADMIN";
    superAdmin.companyId = null;
    superAdmin.status = "active";
    superAdmin.isActive = true;
    superAdmin.password = adminPassword;
    await superAdmin.save();
    console.log(`--> Updated existing SUPER_ADMIN: ${superAdminEmail}`);
  }

  // Also ensure legacy admin@careerconnect.com has SUPER_ADMIN role
  const legacyAdmin = await User.findOne({ email: "admin@careerconnect.com" });
  if (legacyAdmin) {
    legacyAdmin.role = "SUPER_ADMIN";
    legacyAdmin.companyId = null;
    legacyAdmin.status = "active";
    legacyAdmin.isActive = true;
    legacyAdmin.password = adminPassword;
    await legacyAdmin.save();
    console.log("--> Synced legacy admin@careerconnect.com to SUPER_ADMIN");
  }

  // 3. Company Admin for TechCorp Global
  const techCorpAdminEmail = "techcorp.admin@careerconnect.com";
  let techCorpAdmin = await User.findOne({ email: techCorpAdminEmail });
  if (!techCorpAdmin) {
    techCorpAdmin = await User.create({
      fullName: "TechCorp Administrator",
      username: "techcorp_admin",
      email: techCorpAdminEmail,
      password: adminPassword,
      role: "COMPANY_ADMIN",
      userType: "admin",
      companyId: techCorp._id,
      phone: "9876540001",
      countryCode: "+91",
      status: "active",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
      hasPassword: true,
    });
    console.log(`--> Created COMPANY_ADMIN for TechCorp: ${techCorpAdminEmail}`);
  } else {
    techCorpAdmin.role = "COMPANY_ADMIN";
    techCorpAdmin.companyId = techCorp._id;
    techCorpAdmin.status = "active";
    techCorpAdmin.isActive = true;
    techCorpAdmin.password = adminPassword;
    await techCorpAdmin.save();
    console.log(`--> Updated COMPANY_ADMIN for TechCorp: ${techCorpAdminEmail}`);
  }

  // 4. Company Admin for Innovate Labs
  const innovateAdminEmail = "innovate.admin@careerconnect.com";
  let innovateAdmin = await User.findOne({ email: innovateAdminEmail });
  if (!innovateAdmin) {
    innovateAdmin = await User.create({
      fullName: "InnovateLabs Administrator",
      username: "innovate_admin",
      email: innovateAdminEmail,
      password: adminPassword,
      role: "COMPANY_ADMIN",
      userType: "admin",
      companyId: innovateLabs._id,
      phone: "9876540002",
      countryCode: "+91",
      status: "active",
      isActive: true,
      isEmailVerified: true,
      isProfileComplete: true,
      hasPassword: true,
    });
    console.log(`--> Created COMPANY_ADMIN for Innovate Labs: ${innovateAdminEmail}`);
  } else {
    innovateAdmin.role = "COMPANY_ADMIN";
    innovateAdmin.companyId = innovateLabs._id;
    innovateAdmin.status = "active";
    innovateAdmin.isActive = true;
    innovateAdmin.password = adminPassword;
    await innovateAdmin.save();
    console.log(`--> Updated COMPANY_ADMIN for Innovate Labs: ${innovateAdminEmail}`);
  }

  // 5. Associate sample jobs & internships to ensure dynamic tenant data
  await Job.updateMany(
    { companyName: /techcorp/i },
    { $set: { companyId: techCorp._id } }
  );
  await Job.updateMany(
    { companyName: /innovate/i },
    { $set: { companyId: innovateLabs._id } }
  );
  await Internship.updateMany(
    { companyName: /techcorp/i },
    { $set: { companyId: techCorp._id } }
  );

  // Link any unassigned job/internship for demonstration
  const sampleJob = await Job.findOne();
  if (sampleJob && !sampleJob.companyId) {
    sampleJob.companyId = techCorp._id;
    await sampleJob.save();
  }

  // Link applications
  await Application.updateMany(
    { companyName: /techcorp/i },
    { $set: { companyId: techCorp._id } }
  );

  // 6. Sample Report
  const existingReport = await Report.findOne();
  if (!existingReport) {
    await Report.create({
      reportType: "Company complaint",
      status: "Open",
      companyId: techCorp._id,
      targetType: "Company",
      targetTitle: "TechCorp Global",
      details: "Inquiry regarding delayed candidate interview status update.",
      reportedByName: "Candidate Reviewer",
    });
    console.log("--> Created sample Report for TechCorp");
  }

  console.log("\n==================================================");
  console.log("   ADMIN PORTAL SEEDING COMPLETE!   ");
  console.log("==================================================");
  console.log("SUPER_ADMIN Login:");
  console.log(`   Email:    superadmin@careerconnect.com (or admin@careerconnect.com)`);
  console.log("   Password: [Configured in ADMIN_PASSWORD / SEED_ADMIN_PASSWORD]");
  console.log("\nCOMPANY_ADMIN Login (TechCorp Global):");
  console.log(`   Email:    techcorp.admin@careerconnect.com`);
  console.log("   Password: [Configured in ADMIN_PASSWORD / SEED_ADMIN_PASSWORD]");
  console.log("\nCOMPANY_ADMIN Login (Innovate Labs):");
  console.log(`   Email:    innovate.admin@careerconnect.com`);
  console.log("   Password: [Configured in ADMIN_PASSWORD / SEED_ADMIN_PASSWORD]");
  console.log("==================================================\n");

  await mongoose.disconnect();
}

seedAdminPortal().catch(console.error);
