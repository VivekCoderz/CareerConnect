require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const User = require("../models/User");

async function seedAdmin() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for Admin check/seed...");

  const adminEmail = "admin@careerconnect.com";
  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    admin = new User({
      fullName: "CareerConnect Administrator",
      username: "admin_master",
      email: adminEmail,
      password: "TestAdminPassword123!",
      role: "admin",
      userType: "employer",
      phone: "9876543210",
      countryCode: "+91",
      isEmailVerified: true,
      isActive: true,
      isProfileComplete: true,
      hasPassword: true,
    });
    await admin.save();
    console.log(`Created new Admin user: ${adminEmail} (password: TestAdminPassword123!)`);
  } else {
    admin.role = "admin";
    admin.isActive = true;
    admin.isEmailVerified = true;
    admin.isProfileComplete = true;
    admin.hasPassword = true;
    if (!admin.phone) admin.phone = "9876543210";
    admin.password = "TestAdminPassword123!";
    await admin.save();
    console.log(`Updated existing user ${adminEmail} to Admin (role: admin, password: TestAdminPassword123!)`);
  }

  console.log("Admin details:", {
    id: admin._id,
    email: admin.email,
    role: admin.role,
    userType: admin.userType,
  });

  await mongoose.disconnect();
}

seedAdmin().catch(console.error);
