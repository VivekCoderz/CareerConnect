jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
jest.mock("../../services/emailValidationService", () => ({
  validateEmail: jest.fn().mockImplementation(async (email) => ({ isValid: true, normalizedEmail: email })),
  maskEmail: (email) => email,
}));

const request = require("supertest");
const app = require("../../app");
const sendEmail = require("../../utils/sendEmail");
const Application = require("../../models/Application");
const EmailDailyCount = require("../../models/EmailDailyCount");
const Notification = require("../../models/Notification");
const { createTestJob } = require("../helpers/createTestJob");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const {
  NOTIFICATION_EMAIL_DAILY_CAP,
  istDay,
  flushNotificationEmails,
} = require("../../services/notificationEmail");
const { notifyEmployerVerification } = require("../../services/accountNotifications");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const sentTo = (email) => sendEmail.mock.calls.filter(([msg]) => msg.to === email).map(([msg]) => msg);
const settle = () => flushNotificationEmails();
const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe("transactional emails (G03)", () => {
  let candidate;
  let employer;
  let admin;
  let profile;
  let job;
  let application;

  beforeEach(async () => {
    sendEmail.mockClear();
    sendEmail.mockResolvedValue({ messageId: "test-message" });
    candidate = await createUserWithToken({ email: "g03-candidate@example.com", fullName: "Cara Candidate" });
    employer = await createEmployerWithToken({ email: "g03-employer@example.com", fullName: "Emil Employer" });
    admin = await createUserWithToken({ email: "g03-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });
    profile = await createEmployerProfile(employer.user._id, { companyName: "Mail Co" });
    job = await createTestJob(profile._id, { title: "Mail Engineer", createdBy: employer.user._id, approvedAt: new Date() });
    application = await Application.create({
      candidateId: candidate.user._id,
      jobId: job._id,
      employerId: profile._id,
      opportunityType: "Job",
      opportunityTitle: "Mail Engineer",
      companyName: "Mail Co",
      fullName: "Cara Candidate",
      email: candidate.user.email,
      status: "Shortlisted",
    });
  });

  afterEach(() => settle());

  describe("candidate emails", () => {
    const setStatus = (status) =>
      request(app).patch(`/api/applications/${application._id}/status`).set(auth(employer)).send({ status });

    it("sends one email when the application status changes, none when unchanged", async () => {
      expect((await setStatus("Assessment")).status).toBe(200);
      await settle();
      const emails = sentTo(candidate.user.email);
      expect(emails).toHaveLength(1);
      expect(emails[0].subject).toBe("Application update: Mail Engineer");
      expect(emails[0].html).toContain("Assessment");
      expect(emails[0].html).toContain("http://localhost:5173/student/dashboard?tab=applications");

      expect((await setStatus("Assessment")).status).toBe(200);
      await settle();
      expect(sentTo(candidate.user.email)).toHaveLength(1);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("sends one email per interview event, with the meeting link only to the candidate", async () => {
      const scheduled = await request(app).post("/api/interviews").set(auth(employer)).send({
        applicationId: String(application._id),
        scheduledDate: futureDate(3),
        startTime: "10:00",
        interviewType: "Online",
        meetingLink: "https://meet.example.com/abc",
        notes: "Private interviewer notes",
        instructions: "Internal: check salary history",
      });
      expect(scheduled.status).toBe(201);
      await settle();
      let emails = sentTo(candidate.user.email);
      expect(emails).toHaveLength(1); // the "Interview Scheduled" status change does not send a second email
      expect(emails[0].subject).toMatch(/^Interview scheduled/);
      expect(emails[0].html).toContain("https://meet.example.com/abc");
      expect(emails[0].html).not.toMatch(/Private interviewer notes|salary history/);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      const interviewId = scheduled.body.interview?._id || scheduled.body.data?._id;
      const reschedule = (body) =>
        request(app).patch(`/api/interviews/${interviewId}/reschedule`).set(auth(employer)).send(body);
      expect((await reschedule({ scheduledDate: futureDate(5), startTime: "11:00" })).status).toBe(200);
      await settle();
      emails = sentTo(candidate.user.email);
      expect(emails).toHaveLength(2);
      expect(emails[1].subject).toMatch(/^Interview rescheduled/);

      expect((await reschedule({ scheduledDate: futureDate(5), startTime: "11:00" })).status).toBe(200);
      await settle();
      expect(sentTo(candidate.user.email)).toHaveLength(2); // same time again: no email

      const cancel = await request(app).patch(`/api/interviews/${interviewId}/cancel`).set(auth(employer)).send({});
      expect(cancel.status).toBe(200);
      await settle();
      emails = sentTo(candidate.user.email);
      expect(emails).toHaveLength(3);
      expect(emails[2].subject).toMatch(/^Interview cancelled/);
      expect(emails[2].html).not.toContain("meet.example.com");
      expect(sentTo(employer.user.email)).toHaveLength(0);
    });

    it("sends one email when an offer is sent, without salary details", async () => {
      const res = await request(app).post("/api/offers").set(auth(employer)).send({
        candidateId: String(candidate.user._id),
        jobId: String(job._id),
        applicationId: String(application._id),
        designation: "Mail Engineer",
        salary: 987654,
        joiningDate: futureDate(30),
        expiryDate: futureDate(10),
      });
      expect(res.status).toBe(201);
      await settle();
      const emails = sentTo(candidate.user.email);
      expect(emails).toHaveLength(1);
      expect(emails[0].subject).toBe("You have a job offer from Mail Co");
      expect(emails[0].html).not.toContain("987654");
      expect(emails[0].html).toContain("http://localhost:5173/applications");
    });
  });

  describe("employer notifications", () => {
    it("listing approve/reject: valid in-app notification and one email to the owner", async () => {
      const pending = await createTestJob(profile._id, {
        title: "Pending <b>Role</b>", createdBy: employer.user._id, status: "Pending Approval",
      });

      const approve = await request(app)
        .post(`/api/admin/opportunities/job/${pending._id}/approve`).set(auth(admin)).send({ adminNote: "internal note" });
      expect(approve.status).toBe(200);
      await settle();

      const notifs = await Notification.find({ recipient: employer.user._id }).lean();
      expect(notifs).toHaveLength(1);
      expect(notifs[0]).toMatchObject({ notificationType: "LISTING_STATUS", title: "Listing approved" });
      let emails = sentTo(employer.user.email);
      expect(emails).toHaveLength(1);
      expect(emails[0].html).toContain("Pending &lt;b&gt;Role&lt;/b&gt;"); // user text is escaped
      expect(emails[0].html).not.toContain("internal note");

      await request(app).post(`/api/admin/opportunities/job/${pending._id}/reject`).set(auth(admin))
        .send({ rejectionReason: "Salary range missing", adminNote: "internal only" });
      await settle();
      emails = sentTo(employer.user.email);
      expect(emails).toHaveLength(2);
      expect(emails[1].html).toContain("Salary range missing");
      expect(emails[1].html).not.toContain("internal only");
      expect(await Notification.countDocuments({ recipient: employer.user._id, notificationType: "LISTING_STATUS" })).toBe(2);
    });

    it("company verification: in-app notification and one email", async () => {
      const res = await request(app)
        .patch(`/api/admin/employers/${profile._id}/verification`).set(auth(admin))
        .send({ status: "rejected", reason: "Could not verify" });
      expect(res.status).toBe(200);
      await settle();

      const notif = await Notification.findOne({ recipient: employer.user._id }).lean();
      expect(notif).toMatchObject({ notificationType: "COMPANY_VERIFICATION", title: "Company verification not approved" });
      const emails = sentTo(employer.user.email);
      expect(emails).toHaveLength(1);
      expect(emails[0].html).toContain("Could not verify");
    });

    it("mentions listings closed because of the rejection", async () => {
      await notifyEmployerVerification({ profile, status: "rejected", closedListings: { jobs: 2, internships: 1 } });
      await settle();
      expect(sentTo(employer.user.email)[0].text).toContain("3 of your listing(s) were closed");
    });

    it("does not notify for external listings", async () => {
      const external = await createTestJob(null, { title: "External", isExternal: true, createdBy: null, status: "Pending Approval" });
      await request(app).post(`/api/admin/opportunities/job/${external._id}/approve`).set(auth(admin)).send({});
      await settle();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("daily cap", () => {
    it(`stops notification emails at ${NOTIFICATION_EMAIL_DAILY_CAP}/day but OTP still sends`, async () => {
      await EmailDailyCount.create({ day: istDay(), category: "notification", count: NOTIFICATION_EMAIL_DAILY_CAP - 1 });
      const setStatus = (status) =>
        request(app).patch(`/api/applications/${application._id}/status`).set(auth(employer)).send({ status });

      await setStatus("Assessment");
      await settle();
      await setStatus("Interview");
      await settle();
      expect(sentTo(candidate.user.email)).toHaveLength(1);
      expect((await EmailDailyCount.findOne({ day: istDay() }).lean()).count).toBe(NOTIFICATION_EMAIL_DAILY_CAP);

      const otp = await request(app).post("/api/auth/send-otp").send({ email: "brand-new@example.com" });
      expect(otp.status).toBe(200);
      expect(sentTo("brand-new@example.com")).toHaveLength(1);
    });
  });

  describe("failures", () => {
    it("an email failure doesn't fail the request and frees the slot", async () => {
      sendEmail.mockRejectedValueOnce(new Error("Brevo down"));
      const res = await request(app)
        .patch(`/api/applications/${application._id}/status`).set(auth(employer)).send({ status: "Assessment" });
      expect(res.status).toBe(200);
      await settle();
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect((await EmailDailyCount.findOne({ day: istDay() }).lean()).count).toBe(0);
    });

    it("doesn't wait for the email before responding", async () => {
      let release;
      sendEmail.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
      const res = await request(app)
        .patch(`/api/applications/${application._id}/status`).set(auth(employer)).send({ status: "Assessment" });
      expect(res.status).toBe(200); // responded while the email is still pending
      await new Promise((r) => setTimeout(r, 50));
      release?.({ messageId: "late" });
      await settle();
    });
  });
});
