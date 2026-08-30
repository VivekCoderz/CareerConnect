const mongoose = require("mongoose");
const seedInitialJobs = require("../utils/seedJobs");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected successfully 🎉`);
    // Seed initial dynamic jobs if database is empty
    // await seedInitialJobs();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
