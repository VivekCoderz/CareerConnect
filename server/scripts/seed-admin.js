require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch(e){}

const User = require("../models/User");

async function seedAdmin() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log("Connected to MongoDB for Admin check/seed...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD or SEED_ADMIN_PASSWORD must be configured in environment variables.");
  }

  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    admin = new User({
      fullName: "CareerConnect Administrator",
      username: "",
      email: adminEmail,
      password: adminPassword,
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
    console.log(`Created new Admin user: ${adminEmail}`);
  } else {
    admin.role = "admin";
    admin.isActive = true;
    admin.isEmailVerified = true;
    admin.isProfileComplete = true;
    admin.hasPassword = true;
    if (!admin.phone) admin.phone = "9876543210";
    admin.password = adminPassword;
    await admin.save();
    console.log(`Updated existing user ${adminEmail} to Admin (role: admin)`);
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
