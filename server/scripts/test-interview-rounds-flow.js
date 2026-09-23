// server/scripts/test-interview-rounds-flow.js
require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../models/Job");
const { pickListingUpdate } = require("../utils/listingSecurity");

async function runTest() {
  console.log("🧪 Testing Job interviewRounds schema and security update logic...");

  // Test 1: Verify schema default
  const defaultJob = new Job({
    title: "Test Default Job",
    location: "Bangalore",
    description: "Testing default interview rounds",
  });

  if (!defaultJob.interviewRounds || defaultJob.interviewRounds.length === 0) {
    throw new Error("Default interview rounds not set on Job instance!");
  }
  console.log("✅ Test 1: Default interview rounds created correctly:", defaultJob.interviewRounds.length, "round(s)");
  console.log("   Round 1 name:", defaultJob.interviewRounds[0].name);

  // Test 2: Custom interview rounds instantiation
  const customRounds = [
    {
      order: 1,
      name: "Online Assessment (Coding)",
      type: "coding",
      description: "2 algorithmic problems on DSA",
      isMandatory: true,
    },
    {
      order: 2,
      name: "Technical Architecture & System Design",
      type: "technical",
      description: "Deep dive into system components and API design",
      isMandatory: true,
    },
    {
      order: 3,
      name: "Culture Fit & HR Discussion",
      type: "hr",
      description: "Behavioral questions and cultural alignment",
      isMandatory: false,
    },
  ];

  const customJob = new Job({
    title: "Full Stack Engineer",
    location: "Remote / Hybrid",
    description: "Looking for an engineer",
    interviewRounds: customRounds,
  });

  if (customJob.interviewRounds.length !== 3) {
    throw new Error(`Expected 3 rounds, got ${customJob.interviewRounds.length}`);
  }
  if (customJob.interviewRounds[1].name !== "Technical Architecture & System Design") {
    throw new Error("Round 2 name mismatch");
  }
  if (customJob.interviewRounds[2].isMandatory !== false) {
    throw new Error("Round 3 isMandatory mismatch");
  }
  console.log("✅ Test 2: Custom rounds initialized properly with 3 configured rounds.");

  // Test 3: Verify pickListingUpdate allows interviewRounds
  const rawUpdateBody = {
    title: "Updated Title",
    salaryRange: { min: 800000, max: 1500000 },
    interviewRounds: [
      { order: 1, name: "Screening Round", type: "other" },
      { order: 2, name: "Final Interview", type: "final" },
    ],
    unauthorizedField: "hacker_payload",
  };

  const allowedUpdates = pickListingUpdate(rawUpdateBody);
  if (!allowedUpdates.interviewRounds || allowedUpdates.interviewRounds.length !== 2) {
    throw new Error("pickListingUpdate stripped interviewRounds!");
  }
  if (allowedUpdates.unauthorizedField) {
    throw new Error("pickListingUpdate failed to strip unauthorized field!");
  }
  console.log("✅ Test 3: listingSecurity.pickListingUpdate allows interviewRounds and strips unauthorized fields.");

  console.log("\n🎉 All backend unit & schema validations passed successfully!");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
