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

async function checkEmployerEligible() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/careerconnect";
  await mongoose.connect(mongoUri);

  const employer = await User.findById("6a9fe72c98c873cc11e875e1");
  console.log("Employer:", employer.fullName, employer.email);

  const req = {
    user: employer,
    query: {},
  };
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log("Response:", JSON.stringify(data, null, 2));
      return this;
    },
  };

  await interviewController.getEligibleCandidates(req, res, (err) => console.error(err));

  await mongoose.disconnect();
}

checkEmployerEligible().catch(console.error);
