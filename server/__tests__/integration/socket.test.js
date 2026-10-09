const http = require("http");
const jwt = require("jsonwebtoken");
const { io: connectClient } = require("socket.io-client");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const Interview = require("../../models/Interview");
const socketService = require("../../services/socketService");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const ALLOWED_ORIGIN = "http://localhost:5173";
const SENSITIVE_KEYS = ["interview", "application", "feedback", "scorecard", "notes", "meetingLink", "email", "phone"];

describe("socket.io lockdown (S05)", () => {
  let httpServer;
  let url;
  const openSockets = [];

  beforeAll(async () => {
    httpServer = http.createServer();
    socketService.init(httpServer);
    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
  });

  afterEach(() => {
    while (openSockets.length) openSockets.pop().disconnect();
  });

  afterAll(async () => {
    await new Promise((resolve) => socketService.getIO().close(() => resolve()));
  });

  // Resolves with the connected socket, or rejects with the connect_error message.
  const connect = ({ token, origin = ALLOWED_ORIGIN, transports = ["websocket"] } = {}) =>
    new Promise((resolve, reject) => {
      const extraHeaders = {};
      if (origin) extraHeaders.Origin = origin;
      if (token) extraHeaders.Cookie = `token=${token}`;
      const socket = connectClient(url, { transports, extraHeaders, forceNew: true, reconnection: false });
      openSockets.push(socket);
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", (err) => {
        socket.disconnect();
        reject(err);
      });
    });

  const collect = (socket, events) => {
    const received = [];
    events.forEach((event) => socket.on(event, (payload) => received.push({ event, payload })));
    return received;
  };

  const nextEvent = (socket, event) =>
    new Promise((resolve) => socket.once(event, (payload) => resolve(payload)));

  // Lets any stray deliveries arrive before asserting that nothing was received.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

  const joinInterview = (socket, interviewId) =>
    new Promise((resolve) => socket.emit("join_interview", String(interviewId), resolve));

  let candidateA;
  let candidateB;
  let employer;
  let employerProfile;
  let interviewB;
  let applicationB;

  beforeEach(async () => {
    candidateA = await createUserWithToken({ email: "sock-a@example.com" });
    candidateB = await createUserWithToken({ email: "sock-b@example.com" });
    employer = await createEmployerWithToken({ email: "sock-employer@example.com" });
    employerProfile = await EmployerProfile.create({
      userId: employer.user._id,
      companyName: "Socket Co",
      industry: "Technology",
    });
    const job = await createTestJob(employerProfile._id, { createdBy: employer.user._id });
    applicationB = await Application.create({
      candidateId: candidateB.user._id,
      jobId: job._id,
      employerId: employerProfile._id,
      opportunityType: "Job",
      opportunityTitle: "Socket Engineer",
      fullName: "Candidate B",
      email: "sock-b@example.com",
      status: "Shortlisted",
      notes: [{ text: "private recruiter note" }],
    });
    interviewB = await Interview.create({
      employerId: employerProfile._id,
      jobId: job._id,
      candidateId: candidateB.user._id,
      applicationId: applicationB._id,
      scheduledDate: "2026-10-15",
      notes: "private interviewer notes",
      meetingLink: "https://meet.example.com/secret",
      feedback: { overallFeedback: "strong candidate", comments: "hire" },
      scorecard: { technicalSkills: 5, feedback: "excellent" },
    });
  });

  describe("handshake", () => {
    it("rejects a connection without the auth cookie", async () => {
      await expect(connect()).rejects.toThrow("NOT_AUTHENTICATED");
    });

    it("rejects an invalid or revoked token", async () => {
      await expect(connect({ token: "not-a-jwt" })).rejects.toThrow("NOT_AUTHENTICATED");

      candidateA.user.authVersion = 1;
      await candidateA.user.save();
      const stale = jwt.sign({ id: String(candidateA.user._id), av: 0 }, process.env.JWT_SECRET);
      await expect(connect({ token: stale })).rejects.toThrow("NOT_AUTHENTICATED");
    });

    it("rejects a forged or expired token for a real user", async () => {
      const id = String(candidateA.user._id);
      const forged = jwt.sign({ id }, "attacker-chosen-secret");
      const expired = jwt.sign({ id, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);

      await expect(connect({ token: forged })).rejects.toThrow("NOT_AUTHENTICATED");
      await expect(connect({ token: expired })).rejects.toThrow("NOT_AUTHENTICATED");
    });

    it("rejects a suspended account", async () => {
      candidateA.user.isActive = false;
      await candidateA.user.save();
      await expect(connect({ token: candidateA.token })).rejects.toThrow("NOT_AUTHENTICATED");
    });

    it("rejects a disallowed origin even with a valid token", async () => {
      const token = candidateA.token;
      await expect(connect({ token, origin: "https://evil.example.com" })).rejects.toThrow();
      await expect(
        connect({ token, origin: "https://evil.example.com", transports: ["polling"] })
      ).rejects.toThrow();
      await expect(connect({ token, origin: null })).rejects.toThrow();
    });

    it("accepts an allowed origin with a valid cookie", async () => {
      const socket = await connect({ token: candidateA.token });
      expect(socket.connected).toBe(true);
    });
  });

  describe("event routing", () => {
    it("never delivers user B's APPLICATION_UPDATED to user A", async () => {
      const socketA = await connect({ token: candidateA.token });
      const socketB = await connect({ token: candidateB.token });
      const receivedByA = collect(socketA, ["APPLICATION_UPDATED"]);

      // The removed join handlers must not let A subscribe to B's rooms.
      socketA.emit("join_user", String(candidateB.user._id));
      socketA.emit("join_candidate", String(candidateB.user._id));
      await settle();

      const deliveredToB = nextEvent(socketB, "APPLICATION_UPDATED");
      socketService.emitApplicationUpdated(applicationB);
      const payload = await deliveredToB;
      await settle();

      expect(payload.applicationId).toBe(String(applicationB._id));
      expect(receivedByA).toEqual([]);
    });

    it("never delivers user B's INTERVIEW_* events to user A", async () => {
      const socketA = await connect({ token: candidateA.token });
      const socketB = await connect({ token: candidateB.token });
      const events = ["INTERVIEW_SCHEDULED", "INTERVIEW_RESCHEDULED", "INTERVIEW_CANCELLED", "INTERVIEW_STATUS_UPDATED"];
      const receivedByA = collect(socketA, events);
      const receivedByB = collect(socketB, events);

      socketService.emitInterviewScheduled(candidateB.user._id, interviewB);
      socketService.emitInterviewRescheduled(candidateB.user._id, interviewB);
      socketService.emitInterviewCancelled(candidateB.user._id, interviewB);
      socketService.emitInterviewStatusUpdated(candidateB.user._id, interviewB);
      await settle();

      expect(receivedByB.map((r) => r.event)).toEqual(events);
      expect(receivedByA).toEqual([]);
    });

    it("delivers events to the owning employer but not to another employer", async () => {
      const other = await createEmployerWithToken({ email: "sock-other-employer@example.com" });
      await EmployerProfile.create({ userId: other.user._id, companyName: "Other Co", industry: "Retail" });
      const owner = await connect({ token: employer.token });
      const stranger = await connect({ token: other.token });
      const receivedByStranger = collect(stranger, ["APPLICATION_UPDATED", "INTERVIEW_STATUS_UPDATED"]);

      const toOwner = nextEvent(owner, "INTERVIEW_STATUS_UPDATED");
      socketService.emitApplicationUpdated(applicationB);
      socketService.emitInterviewStatusUpdated(candidateB.user._id, interviewB);
      expect((await toOwner).interviewId).toBe(String(interviewB._id));
      await settle();

      expect(receivedByStranger).toEqual([]);
    });
  });

  describe("join_interview", () => {
    it("ignores a join for someone else's interview", async () => {
      const socketA = await connect({ token: candidateA.token });
      const receivedByA = collect(socketA, ["INTERVIEW_STATUS_UPDATED"]);

      expect(await joinInterview(socketA, interviewB._id)).toEqual({ joined: false });
      expect(await joinInterview(socketA, "not-an-id")).toEqual({ joined: false });
      socketService.emitInterviewStatusUpdated(candidateB.user._id, interviewB);
      await settle();

      expect(receivedByA).toEqual([]);
    });

    it("lets the interview's candidate and employer join", async () => {
      const socketB = await connect({ token: candidateB.token });
      const owner = await connect({ token: employer.token });

      expect(await joinInterview(socketB, interviewB._id)).toEqual({ joined: true });
      expect(await joinInterview(owner, interviewB._id)).toEqual({ joined: true });
    });
  });

  describe("payloads", () => {
    it("sends only ids, type, status and timestamp", async () => {
      const socketB = await connect({ token: candidateB.token });

      const interviewEvent = nextEvent(socketB, "INTERVIEW_SCHEDULED");
      const applicationEvent = nextEvent(socketB, "APPLICATION_UPDATED");
      socketService.emitInterviewScheduled(candidateB.user._id, interviewB);
      socketService.emitApplicationUpdated(applicationB);
      const [interviewPayload, applicationPayload] = await Promise.all([interviewEvent, applicationEvent]);

      expect(Object.keys(interviewPayload).sort()).toEqual(
        ["applicationId", "candidateId", "interviewId", "status", "timestamp", "type"]
      );
      expect(interviewPayload).toMatchObject({
        type: "INTERVIEW_SCHEDULED",
        interviewId: String(interviewB._id),
        applicationId: String(applicationB._id),
        status: "scheduled",
      });
      expect(Object.keys(applicationPayload).sort()).toEqual(
        ["applicationId", "candidateId", "status", "timestamp", "type"]
      );
      expect(applicationPayload.status).toBe("Shortlisted");

      for (const payload of [interviewPayload, applicationPayload]) {
        SENSITIVE_KEYS.forEach((key) => expect(payload).not.toHaveProperty(key));
        expect(JSON.stringify(payload)).not.toMatch(/private|secret|strong candidate|excellent/);
      }
    });
  });
});
