require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const EmployerProfile = require("../models/EmployerProfile");
const interviewController = require("../controllers/interviewController");

async function testAllStudents() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);

  const students = await User.find({ userType: "student" });

  for (const student of students) {
    const req = {
      user: student,
      query: {},
    };
    let result = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        result = data;
        return this;
      },
    };

    await interviewController.getInterviews(req, res, (err) => console.error(err));
    console.log(`Student [${student.fullName}] (${student.email}) ID: ${student._id} => Interviews: ${result?.interviews?.length || 0}`);
  }

  await mongoose.disconnect();
}

testAllStudents().catch(console.error);
