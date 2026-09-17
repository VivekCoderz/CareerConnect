require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]); } catch (e) {}

const User = require("../models/User");

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in your environment / .env file.");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for Admin setup...");

  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    admin = new User({
      fullName: "CareerConnect Administrator",
      username: "admin_master",
      email: adminEmail,
      password: adminPassword, // pre("save") hook in User model securely hashes with bcrypt
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
    console.log(`[SUCCESS] Admin account created successfully for: ${adminEmail}`);
  } else {
    // Update existing user to ADMIN role and set password
    admin.role = "admin";
    admin.isActive = true;
    admin.isEmailVerified = true;
    admin.isProfileComplete = true;
    admin.hasPassword = true;
    if (!admin.phone) admin.phone = "9876543210";
    admin.password = adminPassword; // Triggers pre("save") bcrypt hash
    await admin.save();
    console.log(`[SUCCESS] Existing user updated to verified Admin role: ${adminEmail}`);
  }

  console.log("Admin ID:", admin._id.toString());
  console.log("Role:", admin.role);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Admin creation complete.");
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
