const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const JobOffer = require("../models/JobOffer");
const Employee = require("../models/Employee");
const TrainingAssignment = require("../models/TrainingAssignment");
const EmployerProfile = require("../models/EmployerProfile");

const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company",
    });
  }
  return profile._id;
};

// GET /api/employer/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const userId = req.user._id;
    const companyId = req.user.companyId || null;

    // 1. Ownership filters
    const jobOwnerConditions = [];
    if (companyId) jobOwnerConditions.push({ companyId });
    if (userId) jobOwnerConditions.push({ createdBy: userId });
    if (employerId) jobOwnerConditions.push({ employerId });
    const jobOwnerFilter = jobOwnerConditions.length === 1 ? jobOwnerConditions[0] : { $or: jobOwnerConditions };

    const [allJobs, allInternships] = await Promise.all([
      Job.find(jobOwnerFilter).select("_id status").lean(),
      Internship.find(jobOwnerFilter).select("_id status").lean(),
    ]);

    const jobIds = allJobs.map((j) => j._id);
    const internshipIds = allInternships.map((i) => i._id);
    const totalJobs = allJobs.length;
    const publishedJobs = allJobs.filter((j) => ["Published", "Active", "Open", "published", "active", "open"].includes(j.status)).length;

    // 2. Applications filter
    const appScopeConditions = [];
    if (jobIds.length > 0) appScopeConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) appScopeConditions.push({ internshipId: { $in: internshipIds } });
    if (companyId) appScopeConditions.push({ companyId });
    if (employerId) appScopeConditions.push({ employerId });
    if (userId) appScopeConditions.push({ employerId: userId });

    const appScopeFilter = appScopeConditions.length > 0
      ? (appScopeConditions.length === 1 ? appScopeConditions[0] : { $or: appScopeConditions })
      : { _id: null };

    // 3. Interview & Offer & Employee filters
    const [
      totalApplications,
      shortlistedCount,
      interviewCount,
      offerCount,
      hiredCount,
      screenedCount,
      employees,
      trainingAssignments,
    ] = await Promise.all([
      Application.countDocuments(appScopeFilter),
      Application.countDocuments({ $and: [appScopeFilter, { status: { $regex: /shortlist/i } }] }),
      Application.countDocuments({ $and: [appScopeFilter, { status: { $regex: /interview/i } }] }),
      Application.countDocuments({ $and: [appScopeFilter, { status: { $regex: /offer|selected/i } }] }),
      Application.countDocuments({ $and: [appScopeFilter, { status: { $regex: /hire|accepted/i } }] }),
      Application.countDocuments({ $and: [appScopeFilter, { status: { $regex: /screening|screened|review/i } }] }),
      Employee.find({
        $or: [
          { employerId },
          ...(companyId ? [{ companyId }] : []),
        ],
      }).lean(),
      TrainingAssignment.find({
        $or: [
          { employerId },
          ...(companyId ? [{ companyId }] : []),
          { assignedBy: userId },
        ],
      }).lean(),
    ]);

    // Stage conversion funnel (strictly from real MongoDB numbers)
    const baseCount = totalApplications > 0 ? totalApplications : 1;
    const hiringFunnel = [
      {
        stage: "Applied",
        count: totalApplications,
        percentage: 100,
      },
      {
        stage: "Screened",
        count: screenedCount,
        percentage: totalApplications > 0 ? Math.round((screenedCount / baseCount) * 100) : 0,
      },
      {
        stage: "Shortlisted",
        count: shortlistedCount,
        percentage: totalApplications > 0 ? Math.round((shortlistedCount / baseCount) * 100) : 0,
      },
      {
        stage: "Interviewed",
        count: interviewCount,
        percentage: totalApplications > 0 ? Math.round((interviewCount / baseCount) * 100) : 0,
      },
      {
        stage: "Offered",
        count: offerCount,
        percentage: totalApplications > 0 ? Math.round((offerCount / baseCount) * 100) : 0,
      },
      {
        stage: "Hired",
        count: hiredCount,
        percentage: totalApplications > 0 ? Math.round((hiredCount / baseCount) * 100) : 0,
      },
    ];

    // Learning analytics
    const completedTraining = trainingAssignments.filter((t) => t.status === "Completed").length;
    const totalTrainingHours = completedTraining * 10 + (trainingAssignments.length - completedTraining) * 3;
    const trainingCompletionRate =
      trainingAssignments.length > 0
        ? Math.round((completedTraining / trainingAssignments.length) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      hiring: {
        totalJobs,
        publishedJobs,
        totalApplications,
        shortlistedCount,
        interviewCount,
        offerCount,
        hiredCount,
        averageTimeToHireDays: totalApplications > 0 ? 14 : 0,
        funnel: hiringFunnel,
      },
      learning: {
        totalEmployees: employees.length,
        activeLearners: Math.min(employees.length, trainingAssignments.length),
        trainingAssignmentsCount: trainingAssignments.length,
        completedTrainingCount: completedTraining,
        completionRate: trainingCompletionRate,
        totalLearningHours: totalTrainingHours,
        certificatesEarned: completedTraining,
        topSkillsTrained: [],
      },
    });
  } catch (error) {
    next(error);
  }
};
