const request = require("supertest");
const app = require("../../app");
const SupportTicket = require("../../models/SupportTicket");
const Notification = require("../../models/Notification");
const { createUserWithToken } = require("../helpers/createTestUser");

// FL-16: users raise support tickets; platform admins see all of them, set a status and
// reply, and only the person who raised a ticket sees it and the result.
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const raise = (identity, body) => request(app).post("/api/support-tickets").set(auth(identity)).send(body);
const adminUpdate = (identity, id, body) => request(app).patch(`/api/admin/support-tickets/${id}`).set(auth(identity)).send(body);
const feedback = (identity, id, body) => request(app).post(`/api/support-tickets/${id}/feedback`).set(auth(identity)).send(body);

describe("Support tickets (FL-16)", () => {
  let student;
  let employer;
  let superAdmin;

  beforeEach(async () => {
    student = await createUserWithToken({ email: "ticket-student@example.com" });
    employer = await createUserWithToken({ email: "ticket-employer@example.com", role: "employer", userType: "employer" });
    superAdmin = await createUserWithToken({ email: "ticket-root@example.com", role: "SUPER_ADMIN", userType: "admin" });
  });

  it("requires login", async () => {
    const res = await request(app).post("/api/support-tickets").send({ subject: "Help", description: "Please" });
    expect(res.status).toBe(401);
  });

  it("validates the subject and description", async () => {
    const res = await raise(student, { subject: "", description: "Something broke" });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("subject");
    expect(await SupportTicket.countDocuments()).toBe(0);
  });

  it("lets a user raise a ticket and see only their own", async () => {
    const res = await raise(student, { subject: "Can't upload resume", category: "Profile", description: "Upload fails at 90%." });
    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe("Open");
    expect(res.body.ticket.ticketNumber).toMatch(/^TKT-/);

    await raise(employer, { subject: "Billing question", description: "Invoice is missing." });

    const mine = await request(app).get("/api/support-tickets").set(auth(student));
    expect(mine.status).toBe(200);
    expect(mine.body.tickets).toHaveLength(1);
    expect(mine.body.tickets[0].subject).toBe("Can't upload resume");

    const employerTicket = await SupportTicket.findOne({ raisedBy: employer.user._id });
    const peek = await request(app).get(`/api/support-tickets/${employerTicket._id}`).set(auth(student));
    expect(peek.status).toBe(404);
  });

  it("shows every ticket to a platform admin but not to a company admin", async () => {
    await raise(student, { subject: "A", description: "a" });
    await raise(employer, { subject: "B", description: "b" });

    const list = await request(app).get("/api/admin/support-tickets").set(auth(superAdmin));
    expect(list.status).toBe(200);
    expect(list.body.tickets).toHaveLength(2);
    expect(list.body.statusCounts.Open).toBe(2);

    const companyAdmin = await createUserWithToken({ email: "ticket-ca@example.com", role: "COMPANY_ADMIN", userType: "admin" });
    const denied = await request(app).get("/api/admin/support-tickets").set(auth(companyAdmin));
    expect(denied.status).toBe(403);

    const asUser = await request(app).get("/api/admin/support-tickets").set(auth(student));
    expect(asUser.status).toBe(403);
  });

  it("lets an admin set the status and reply, and notifies only the person who raised it", async () => {
    const created = await raise(student, { subject: "Login loop", description: "I keep getting logged out." });
    const id = created.body.ticket._id;

    const update = await request(app)
      .patch(`/api/admin/support-tickets/${id}`)
      .set(auth(superAdmin))
      .send({ status: "Solved", message: "We cleared your old sessions. Please sign in again." });
    expect(update.status).toBe(200);
    expect(update.body.ticket.status).toBe("Solved");
    expect(update.body.ticket.resolvedAt).toBeTruthy();

    const seen = await request(app).get(`/api/support-tickets/${id}`).set(auth(student));
    expect(seen.body.ticket.status).toBe("Solved");
    expect(seen.body.ticket.messages[0]).toMatchObject({ authorRole: "admin", text: expect.stringContaining("cleared") });

    // createNotification runs without being awaited by the request.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const notes = await Notification.find({ notificationType: "SUPPORT_TICKET" }).lean();
    expect(notes).toHaveLength(1);
    expect(String(notes[0].recipient)).toBe(String(student.user._id));
    expect(notes[0].actionUrl).toBe("/student/dashboard?tab=support");
  });

  it("rejects an update with no change", async () => {
    const created = await raise(student, { subject: "X", description: "y" });
    const res = await request(app).patch(`/api/admin/support-tickets/${created.body.ticket._id}`).set(auth(superAdmin)).send({ status: "Open" });
    expect(res.status).toBe(400);
  });
  describe("verdict and user feedback", () => {
    let id;
    beforeEach(async () => {
      const created = await raise(student, { subject: "Payment stuck", description: "Money debited, course locked." });
      id = created.body.ticket._id;
    });

    it("locks the ticket for the admin until the user responds", async () => {
      expect((await adminUpdate(superAdmin, id, { status: "Not Solved", message: "Bank hasn't confirmed yet." })).status).toBe(200);
      const locked = await adminUpdate(superAdmin, id, { message: "One more thing" });
      expect(locked.status).toBe(409);
      expect(locked.body.code).toBe("AWAITING_FEEDBACK");
    });

    it("only accepts feedback while a verdict is waiting, and only from the ticket's owner", async () => {
      expect((await feedback(student, id, { solved: true })).status).toBe(409);
      await adminUpdate(superAdmin, id, { status: "Solved" });
      expect((await feedback(employer, id, { solved: true })).status).toBe(404);
    });

    it("closes the ticket when the user confirms it is solved, and the admin can't change it after", async () => {
      await adminUpdate(superAdmin, id, { status: "Solved", message: "Refund processed." });
      const res = await feedback(student, id, { solved: true });
      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("Closed");
      expect(res.body.ticket.messages.at(-1)).toMatchObject({ authorRole: "user", event: "confirmed" });

      const after = await adminUpdate(superAdmin, id, { message: "Anything else?" });
      expect(after.status).toBe(409);
      expect(after.body.code).toBe("TICKET_CLOSED");
    });

    it("reopens on 'not solved' (message required) and expires on the third", async () => {
      await adminUpdate(superAdmin, id, { status: "Solved" });
      expect((await feedback(student, id, { solved: false })).status).toBe(400);

      const first = await feedback(student, id, { solved: false, message: "Still locked." });
      expect(first.body.ticket).toMatchObject({ status: "Reopened", notSolvedCount: 1 });

      // Reopened: the admin can reply again.
      await adminUpdate(superAdmin, id, { status: "Solved", message: "Try again now." });
      expect((await feedback(student, id, { solved: false, message: "No luck." })).body.ticket.status).toBe("Reopened");

      await adminUpdate(superAdmin, id, { status: "Solved" });
      const third = await feedback(student, id, { solved: false });
      expect(third.status).toBe(200);
      expect(third.body.ticket).toMatchObject({ status: "Expired", notSolvedCount: 3 });
      expect(third.body.ticket.closedAt).toBeTruthy();

      expect((await adminUpdate(superAdmin, id, { message: "Hello?" })).status).toBe(409);
      expect((await feedback(student, id, { solved: true })).status).toBe(409);
    });

    it("doesn't let the admin set Closed or Expired directly", async () => {
      const res = await adminUpdate(superAdmin, id, { status: "Closed" });
      expect(res.status).toBe(400);
    });
  });
});
