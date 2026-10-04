const mongoose = require("mongoose");
const request = require("supertest");
const Sentry = require("@sentry/node");
const app = require("../../app");
const { scrubEvent } = require("../../instrument");
const { createUserWithToken } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const sentryTest = (identity) => {
  const req = request(app).post("/api/admin/debug/sentry-test");
  return identity ? req.set(auth(identity)) : req;
};

describe("I08 Sentry error capture", () => {
  let capture;
  beforeEach(() => {
    capture = jest.spyOn(Sentry, "captureException").mockImplementation(() => "event-id");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  describe("POST /api/admin/debug/sentry-test", () => {
    it("lets a platform admin raise a test error: normal 500 response, sent to Sentry", async () => {
      const admin = await createUserWithToken({ email: "sentry-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });

      const res = await sentryTest(admin);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe("string");
      expect(capture).toHaveBeenCalledTimes(1);
      const [err, hint] = capture.mock.calls[0];
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/^Sentry test error \(backend\)/);
      expect(err.message).not.toContain("sentry-admin@example.com");
      expect(hint.tags).toMatchObject({ status_code: 500 });
    });

    it("rejects anonymous users, students and company admins without raising anything", async () => {
      const student = await createUserWithToken({ email: "sentry-student@example.com" });
      const companyAdmin = await createUserWithToken({
        email: "sentry-company-admin@example.com",
        role: "COMPANY_ADMIN",
        userType: "admin",
        companyId: new mongoose.Types.ObjectId(),
      });

      expect((await sentryTest(null)).statusCode).toBe(401);
      expect((await sentryTest(student)).statusCode).toBe(403);
      expect((await sentryTest(companyAdmin)).statusCode).toBe(403);
      expect(capture).not.toHaveBeenCalled();
    });
  });

  describe("normal API errors", () => {
    it("keeps 4xx responses as they were and does not report them", async () => {
      const missing = await request(app).get(`/api/jobs/${new mongoose.Types.ObjectId()}`);
      const badId = await request(app).get("/api/internships/not-an-id");
      const unauthenticated = await request(app).get("/api/student/dashboard");

      expect(missing.statusCode).toBe(404);
      expect(missing.body.success).toBe(false);
      expect(badId.statusCode).toBe(404);
      expect(unauthenticated.statusCode).toBe(401);
      expect(capture).not.toHaveBeenCalled();
    });

    it("does not report rejected CORS origins", async () => {
      const res = await request(app).get("/api/jobs").set("Origin", "https://evil.example.com");

      expect(res.statusCode).toBe(500);
      expect(capture).not.toHaveBeenCalled();
    });
  });

  describe("scrubEvent", () => {
    it("removes credentials and personal data before an event is sent", () => {
      const event = scrubEvent({
        request: {
          url: "https://api.example.com/api/auth/reset?token=abc123&page=2",
          query_string: "token=abc123&page=2",
          cookies: { token: "jwt" },
          data: { email: "a@b.com", password: "hunter2" },
          headers: { Authorization: "Bearer jwt", Cookie: "token=jwt", "user-agent": "jest", "x-api-key": "k" },
        },
        user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" },
        extra: { nested: { otp: "123456", ok: 1 } },
        breadcrumbs: [{ category: "http", data: { url: "/set-password?token=xyz", status_code: 500 } }],
      });

      expect(event.request.cookies).toBeUndefined();
      expect(event.request.data).toBeUndefined();
      expect(event.request.headers).toEqual({
        Authorization: "[Filtered]",
        Cookie: "[Filtered]",
        "user-agent": "jest",
        "x-api-key": "[Filtered]",
      });
      expect(event.request.url).toBe("https://api.example.com/api/auth/reset");
      expect(event.request.query_string).toBeUndefined();
      expect(event.user).toEqual({ id: "u1" });
      expect(event.extra).toEqual({ nested: { otp: "[Filtered]", ok: 1 } });
      expect(event.breadcrumbs[0].data).toEqual({ url: "/set-password", status_code: 500 });
    });
  });
});
