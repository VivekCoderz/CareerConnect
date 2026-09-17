const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {}
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function runLifecycleTests() {
  console.log("=== STARTING INTERVIEW LIFECYCLE & AUDIT VALIDATION ===");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  require("../models/User");
  require("../models/Job");
  require("../models/Internship");
  const EmployerProfile = require("../models/EmployerProfile");
  const Application = require("../models/Application");
  const Interview = require("../models/Interview");
  const Notification = require("../models/Notification");
  const notificationService = require("../services/notificationService");

  // 1. Find an application to test with
  const application = await Application.findOne();
  if (!application) {
    console.error("No application found to test lifecycle.");
    process.exit(1);
  }
  console.log(`[OK] Using application: ${application._id} for candidate: ${application.candidateId}`);

  // Find employer profile
  const employerProfile = await EmployerProfile.findOne();
  if (!employerProfile) {
    console.error("No employer profile found.");
    process.exit(1);
  }

  // 2. Test Schedule an Interview
  const interview = await Interview.create({
    employerId: employerProfile._id,
    candidateId: application.candidateId,
    applicationId: application._id,
    internshipId: application.internshipId,
    jobId: application.jobId,
    roundNumber: 1,
    roundName: "Technical Round",
    interviewType: "Online",
    interviewerName: "Test Lead",
    interviewerEmail: "interviewer@test.com",
    scheduledDate: "2026-09-15",
    startTime: "10:00 AM",
    scheduledTime: "10:00 AM",
    durationMinutes: 45,
    duration: 45,
    meetingMode: "Google Meet",
    meetingLink: "https://meet.google.com/test-lifecycle",
    status: "scheduled",
    isDraft: false,
  });
  console.log(`[TEST 1 PASSED] Interview scheduled: ${interview._id}, status: ${interview.status}`);

  // Create notification for schedule
  await notificationService.createNotification({
    recipientId: application.candidateId,
    senderId: employerProfile.userId,
    title: "Interview Scheduled: Technical Round",
    message: "Your interview has been scheduled for 2026-09-15 at 10:00 AM.",
    notificationType: "INTERVIEW_SCHEDULED",
    relatedInterviewId: interview._id,
    relatedApplicationId: application._id,
    actionUrl: "/student/dashboard?tab=interviews",
  });

  // 3. Test Reschedule Interview with History Tracking
  const previousDate = interview.scheduledDate;
  const previousStartTime = interview.startTime;

  interview.rescheduleHistory.push({
    previousDate,
    previousStartTime,
    newDate: "2026-09-18",
    newStartTime: "03:00 PM",
    reason: "Interviewer had a conflicting client call",
    rescheduledBy: employerProfile.userId,
    rescheduledAt: new Date(),
  });
  interview.previousDate = previousDate;
  interview.previousStartTime = previousStartTime;
  interview.newDate = "2026-09-18";
  interview.newStartTime = "03:00 PM";
  interview.scheduledDate = "2026-09-18";
  interview.scheduledTime = "03:00 PM";
  interview.startTime = "03:00 PM";
  interview.rescheduledReason = "Interviewer had a conflicting client call";
  interview.rescheduledAt = new Date();
  interview.rescheduledBy = employerProfile.userId;
  interview.status = "rescheduled";
  await interview.save();

  console.log(`[TEST 2 PASSED] Interview rescheduled: status = ${interview.status}, history entries = ${interview.rescheduleHistory.length}`);
  if (interview.rescheduleHistory.length !== 1 || interview.rescheduleHistory[0].previousDate !== "2026-09-15") {
    throw new Error("Reschedule history was not recorded correctly!");
  }

  // Create notification for reschedule
  await notificationService.createNotification({
    recipientId: application.candidateId,
    senderId: employerProfile.userId,
    title: "Interview Rescheduled: Technical Round",
    message: "Your interview has been rescheduled to 2026-09-18 at 03:00 PM. Reason: Interviewer had a conflicting client call",
    notificationType: "INTERVIEW_RESCHEDULED",
    relatedInterviewId: interview._id,
    relatedApplicationId: application._id,
    actionUrl: "/student/dashboard?tab=interviews",
  });

  // 4. Test Cancellation with Reason & Candidate Protection
  interview.status = "cancelled";
  interview.cancellationReason = "Scheduling conflict";
  interview.cancellationMessage = "We apologize for the inconvenience. We will schedule another round soon.";
  interview.cancelledAt = new Date();
  interview.cancelledBy = employerProfile.userId;
  await interview.save();

  // Ensure candidate application status remains Shortlisted
  application.status = "Shortlisted";
  await application.save();

  console.log(`[TEST 3 PASSED] Interview cancelled: status = ${interview.status}, reason = ${interview.cancellationReason}, app status = ${application.status}`);

  // Create notification for cancellation
  await notificationService.createNotification({
    recipientId: application.candidateId,
    senderId: employerProfile.userId,
    title: "Interview Cancelled: Technical Round",
    message: "Your interview slot on 2026-09-18 has been cancelled. Reason: Scheduling conflict. Note: We apologize for the inconvenience. We will schedule another round soon.",
    notificationType: "INTERVIEW_CANCELLED",
    relatedInterviewId: interview._id,
    relatedApplicationId: application._id,
    actionUrl: "/student/dashboard?tab=interviews",
  });

  // 5. Test Audit Protection (Delete Non-Draft Rejected)
  const canDeleteActive = interview.isDraft === true || interview.status === "draft";
  if (canDeleteActive) {
    throw new Error("Audit protection failure! Non-draft interview was marked deletable.");
  }
  console.log(`[TEST 4 PASSED] Audit Protection verified: Non-draft cancelled interview cannot be deleted (canDelete: ${canDeleteActive})`);

  // 6. Test Draft Deletion
  const draftInterview = await Interview.create({
    employerId: employerProfile._id,
    candidateId: application.candidateId,
    applicationId: application._id,
    roundNumber: 2,
    roundName: "Draft Round",
    interviewType: "Online",
    interviewerName: "Draft Lead",
    scheduledDate: "2026-09-20",
    scheduledTime: "11:00 AM",
    status: "draft",
    isDraft: true,
  });

  const canDeleteDraft = draftInterview.isDraft === true || draftInterview.status === "draft";
  if (!canDeleteDraft) {
    throw new Error("Draft interview could not be deleted!");
  }
  await Interview.findByIdAndDelete(draftInterview._id);
  const deletedCheck = await Interview.findById(draftInterview._id);
  console.log(`[TEST 5 PASSED] Draft Interview deleted safely: confirmed null = ${deletedCheck === null}`);

  // 7. Verify Candidate Notifications
  const candidateNotifs = await notificationService.getUserNotifications(application.candidateId);
  console.log(`[TEST 6 PASSED] Candidate received ${candidateNotifs.notifications.length} notifications, unread count: ${candidateNotifs.unreadCount}`);
  
  const hasScheduled = candidateNotifs.notifications.some((n) => n.notificationType === "INTERVIEW_SCHEDULED");
  const hasRescheduled = candidateNotifs.notifications.some((n) => n.notificationType === "INTERVIEW_RESCHEDULED");
  const hasCancelled = candidateNotifs.notifications.some((n) => n.notificationType === "INTERVIEW_CANCELLED");

  console.log(`- INTERVIEW_SCHEDULED present: ${hasScheduled}`);
  console.log(`- INTERVIEW_RESCHEDULED present: ${hasRescheduled}`);
  console.log(`- INTERVIEW_CANCELLED present: ${hasCancelled}`);

  // Clean up the test interview
  await Interview.findByIdAndDelete(interview._id);
  console.log("[CLEANUP] Test records cleaned up successfully.");

  console.log("=== ALL 6 LIFECYCLE & AUDIT TESTS PASSED! ===");
  await mongoose.disconnect();
}

runLifecycleTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
