jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ success: true }));

// CC-03 / CC-04: every in-app notification carries the page its click should open, and
// AI bot mails are not shown in the inbox.
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const Notification = require("../../models/Notification");
const {
  createNotification,
  createOpportunityNotification,
  defaultActionUrl,
} = require("../../services/notificationService");
const { notifyApplicationUpdates } = require("../../services/applicationNotifications");
const { flushNotificationEmails } = require("../../services/notificationEmail");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");

const notify = (recipientId, notificationType, extra = {}) =>
  createNotification({ recipientId, title: notificationType, message: `${notificationType} message`, notificationType, ...extra });

describe("notification links per type", () => {
  afterEach(() => flushNotificationEmails());

  it("links interview notifications to the recipient's own dashboard interviews tab", async () => {
    const student = await createUserWithToken({ email: "links-student@example.com" });
    const fresher = await createUserWithToken({ email: "links-fresher@example.com", userType: "fresher" });
    const professional = await createUserWithToken({ email: "links-pro@example.com", userType: "professional" });

    for (const type of ["INTERVIEW_SCHEDULED", "INTERVIEW_RESCHEDULED", "INTERVIEW_CANCELLED", "INTERVIEW_RESULT"]) {
      expect((await notify(student.user._id, type)).actionUrl).toBe("/student/dashboard?tab=interviews");
      expect((await notify(fresher.user._id, type)).actionUrl).toBe("/fresher/dashboard?tab=interviews");
      expect((await notify(professional.user._id, type)).actionUrl).toBe("/professional/dashboard?tab=interviews");
    }
  });

  it("links application and offer notifications to My Applications for candidates", async () => {
    const candidate = await createUserWithToken({ email: "links-candidate@example.com" });
    const [statusNote] = await notifyApplicationUpdates([{
      _id: new mongoose.Types.ObjectId(),
      candidateId: candidate.user._id,
      opportunityTitle: "Link Engineer",
      companyName: "Links Co",
    }], "Shortlisted");

    expect(statusNote.actionUrl).toBe("/applications");
    expect(statusNote.category).toBe("system");
    expect((await notify(candidate.user._id, "APPLICATION_STATUS")).actionUrl).toBe("/applications");
    expect((await notify(candidate.user._id, "OFFER")).actionUrl).toBe("/applications");
  });

  it("links employer notifications to the employer dashboard", async () => {
    const employer = await createEmployerWithToken({ email: "links-employer@example.com" });
    for (const type of ["OFFER", "COMPANY_VERIFICATION", "LISTING_STATUS"]) {
      expect((await notify(employer.user._id, type)).actionUrl).toBe("/employer/dashboard");
    }
  });

  it("keeps a link the caller chose", async () => {
    const candidate = await createUserWithToken({ email: "links-custom@example.com" });
    const note = await notify(candidate.user._id, "INTERVIEW_SCHEDULED", { actionUrl: "/applications" });
    expect(note.actionUrl).toBe("/applications");
  });

  it("links listing alerts to that listing's own page", async () => {
    const internshipId = new mongoose.Types.ObjectId();
    const jobId = new mongoose.Types.ObjectId();
    const internship = await createOpportunityNotification({ type: "internship", item: { _id: internshipId, title: "Intern" } });
    const job = await createOpportunityNotification({ type: "job", item: { _id: jobId, title: "Engineer" } });

    expect(internship.actionUrl).toBe(`/internships/${internshipId}`);
    expect(internship.category).toBe("internship");
    expect(job.actionUrl).toBe(`/jobs/${jobId}`);
    expect(job.category).toBe("job");
  });

  it("files plain notices as platform notices, not AI mails", async () => {
    const student = await createUserWithToken({ email: "links-inbox@example.com" });
    const plain = await Notification.create({ recipient: student.user._id, title: "Report resolved", message: "Done" });
    expect(plain.category).toBe("system");
    expect(plain.senderRole).toBe("system");
    expect(plain.sender).not.toMatch(/AI/);
    expect(defaultActionUrl("GENERAL", student.user)).toBeNull();
  });

  it("starts a new inbox empty, with no AI welcome mail", async () => {
    const student = await createUserWithToken({ email: "links-welcome@example.com" });
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${student.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.notifications).toEqual([]);
    expect(res.body.unreadCount).toBe(0);
    expect(await Notification.countDocuments({ recipient: student.user._id })).toBe(0);
  });

  it("hides AI bot mails already saved, and does not count them as unread", async () => {
    const student = await createUserWithToken({ email: "links-ai@example.com" });
    await Notification.create([
      { recipient: student.user._id, senderRole: "ai", sender: "E2Job AI Assistant 🤖",
        category: "ai_recommendation", title: "Welcome to E2Job!", content: "E2Job AI Team" },
      { recipient: student.user._id, senderRole: "ai", sender: "E2Job AI Assistant 🤖",
        category: "job", title: "AI Recommendation: Top Pick", content: "AI pick" },
    ]);
    await notify(student.user._id, "INTERVIEW_SCHEDULED");

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${student.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0]).toMatchObject({
      notificationType: "INTERVIEW_SCHEDULED",
      category: "system",
      actionUrl: "/student/dashboard?tab=interviews",
    });
    expect(res.body.unreadCount).toBe(1);
  });

  it("no longer has an endpoint that sends AI mails to the inbox", async () => {
    const student = await createUserWithToken({ email: "links-ai-endpoint@example.com" });
    const res = await request(app)
      .post("/api/ai/send-recommendation-mail")
      .set("Authorization", `Bearer ${student.token}`);
    expect(res.statusCode).toBe(404);
  });
});
