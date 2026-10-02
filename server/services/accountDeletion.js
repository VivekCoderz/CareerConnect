// Permanently deletes a candidate or employer account (DPDP right to erasure).
// Steps are idempotent and the User record is removed last, so a failed run can
// simply be repeated. Records other people rely on are anonymised, not deleted:
// employers keep their pipeline counts, candidates keep their application history.

const User = require("../models/User");
const Resume = require("../models/Resume");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const JobOffer = require("../models/JobOffer");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const Notification = require("../models/Notification");
const NotificationUserState = require("../models/NotificationUserState");
const NotificationReadCursor = require("../models/NotificationReadCursor");
const CourseProgress = require("../models/CourseProgress");
const Enrollment = require("../models/Enrollment");
const AssessmentSubmission = require("../models/AssessmentSubmission");
const AuditLog = require("../models/AuditLog");
const { cleanupOrphanResumeAssets } = require("./resumeAssetCleanup");
const { notifyListingClosedInBackground } = require("./listingClosure");

const FINAL_APPLICATION_STATUSES = ["Hired", "Rejected", "Withdrawn"];
const UPCOMING_INTERVIEW_STATUSES = ["scheduled", "confirmed", "rescheduled", "draft", "Scheduled", "Confirmed", "Rescheduled"];
const OPEN_OFFER_STATUSES = ["Draft", "Sent", "Pending", "draft", "sent", "pending"];

const anonymiseCandidateApplications = async (userId) => {
  const personalData = {
    studentName: "Deleted user",
    studentEmail: "",
    studentPhone: "",
    coverLetter: "",
    resumeUrl: "",
  };
  await Application.updateMany(
    { candidateId: userId, status: { $nin: FINAL_APPLICATION_STATUSES } },
    { $set: { ...personalData, status: "Withdrawn", overallStatus: "Withdrawn", stage: "Withdrawn" } }
  );
  await Application.updateMany({ candidateId: userId }, { $set: personalData });
};

const deleteCandidateData = async (userId) => {
  await anonymiseCandidateApplications(userId);
  await Interview.updateMany(
    { candidateId: userId, status: { $in: UPCOMING_INTERVIEW_STATUSES } },
    { $set: { status: "cancelled" } }
  );
  await JobOffer.updateMany({ candidateId: userId, status: { $in: OPEN_OFFER_STATUSES } }, { $set: { status: "Expired" } });
  await Promise.all([
    Resume.deleteMany({ user: userId }),
    StudentProfile.deleteMany({ userId }),
    FresherProfile.deleteMany({ userId }),
    ProfessionalProfile.deleteMany({ userId }),
    CourseProgress.deleteMany({ student: userId }),
    Enrollment.deleteMany({ userId }),
    AssessmentSubmission.deleteMany({ candidateId: userId }),
  ]);
};

const closeEmployerListings = async (userId) => {
  const profile = await EmployerProfile.findOne({ userId }).select("_id").lean();
  const owner = [{ createdBy: userId }, ...(profile ? [{ employerId: profile._id }] : [])];
  const open = { status: { $nin: ["Closed", "Rejected"] } };
  const [jobIds, internshipIds] = await Promise.all([
    Job.find({ $or: owner, ...open }).distinct("_id"),
    Internship.find({ $or: owner, ...open }).distinct("_id"),
  ]);
  await Promise.all([
    Job.updateMany({ _id: { $in: jobIds } }, { $set: { status: "Closed" } }),
    Internship.updateMany({ _id: { $in: internshipIds } }, { $set: { status: "Closed" } }),
  ]);
  // Candidates still waiting on these listings get a "position filled" notice.
  jobIds.forEach((id) => notifyListingClosedInBackground("job", id));
  internshipIds.forEach((id) => notifyListingClosedInBackground("internship", id));
};

/**
 * Deletes the account. Returns the user's id for logging.
 * Admin accounts are not handled here (a Super Admin removes them).
 */
const deleteAccount = async (user) => {
  const userId = user._id;
  const isEmployer = user.role === "employer" || user.userType === "employer";
  if (isEmployer) {
    await closeEmployerListings(userId);
  } else {
    await deleteCandidateData(userId);
  }

  await Promise.all([
    Notification.deleteMany({ $or: [{ recipient: userId }, { recipientId: userId }] }),
    NotificationUserState.deleteMany({ userId }),
    NotificationReadCursor.deleteMany({ userId }),
  ]);

  await AuditLog.create({
    actorId: userId,
    actorName: "Deleted user",
    action: "ACCOUNT_DELETED",
    module: isEmployer ? "Employers" : "Candidates",
    target: String(userId),
    details: `${user.userType || user.role} account deleted by its owner`,
  }).catch((err) => console.warn("Account deletion audit log failed:", err.message));

  await User.deleteOne({ _id: userId });

  // Resume files are now unreferenced; remove them from Cloudinary in the background.
  setImmediate(() => {
    cleanupOrphanResumeAssets(userId, { minAgeMs: 0 })
      .catch((err) => console.warn(`Resume file cleanup after account deletion failed: ${err.message}`));
  });

  return userId;
};

module.exports = { deleteAccount };
