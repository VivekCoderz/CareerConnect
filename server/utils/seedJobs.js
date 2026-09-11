// utils/seedJobs.js
const mongoose = require("mongoose");
const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Job = require("../models/Job");
const Internship = require("../models/Internship");

const seedInitialJobs = async () => {
  // Hardcoded dummy seed disabled - only live opportunities & real employer postings are used.
  return;
};

module.exports = seedInitialJobs;