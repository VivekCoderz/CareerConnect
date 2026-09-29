const request = require("supertest");
const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

// In-memory store for OTP simulation in tests
const otpStore = {};

jest.mock("../../models/User", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

const mockDeleteOne = jest.fn().mockImplementation((query) => {
  if (query?._id) {
    Object.keys(otpStore).forEach((key) => {
      if (otpStore[key]?._id === query._id) delete otpStore[key];
    });
  } else if (query?.email) {
    delete otpStore[query.email];
  }
  return Promise.resolve({ deletedCount: 1 });
});

jest.mock("../../models/PendingOTP", () => ({
  findOne: jest.fn().mockImplementation((query) => {
    const email = query.email;
    const record = otpStore[email];
    return {
      select: jest.fn().mockResolvedValue(record || null),
    };
  }),
  findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
    const email = query.email;
    otpStore[email] = {
      _id: "mock-otp-id",
      email,
      purpose: update?.$set?.purpose || "verification",
      otpHash: update?.$set?.otpHash || "mock-hash",
      attempts: 0,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    return Promise.resolve(otpStore[email]);
  }),
  deleteOne: mockDeleteOne,
}));

// Mock auth middleware to populate req.user from x-test-user header
jest.mock("../../middleware/authMiddleware", () => {
  const mw = (req, res, next) => {
    const testUser = req.headers["x-test-user"];
    if (testUser) {
      req.user = {
        _id: testUser,
        id: testUser,
        role: "student",
        userType: "student",
      };
    }
    next();
  };
  mw.protect = mw;
  mw.optionalAuth = mw;
  return mw;
});

// Mock external scrapers, AI, emails, and captcha
jest.mock("../../services/jobScraperService", () => ({
  getAggregatedOpportunities: jest.fn().mockResolvedValue({
    count: 1,
    data: [{ id: "mock-internship-1", title: "Software Engineer Intern" }],
    source: "mock",
  }),
}));

jest.mock("../../services/ragAiService", () => ({
  answerUserQuery: jest.fn().mockResolvedValue({
    success: true,
    answer: "Hello! This is a mock AI assistant response.",
  }),
  retrievePlatformContext: jest.fn().mockResolvedValue({
    internships: [],
    jobs: [],
  }),
}));

jest.mock("../../utils/sendEmail", () =>
  jest.fn().mockResolvedValue({ messageId: "mock-email-id-12345" })
);

jest.mock("../../services/emailValidationService", () => ({
  validateEmail: jest.fn().mockResolvedValue({
    isValid: true,
    normalizedEmail: "test@example.com",
  }),
}));

jest.mock("../../middleware/captchaMiddleware", () => () => (req, res, next) => next());

describe("S06 Security: Rate Limiting & Proxy Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(otpStore).forEach((k) => delete otpStore[k]);
    process.env = { ...originalEnv };
    process.env.TRUST_PROXY_HOPS = "1";
    process.env.ENABLE_IP_DEBUG = "true";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function getFreshApp(limitOverrides = {}) {
    process.env.RATE_LIMIT_GLOBAL_MAX = String(limitOverrides.global || 1000);
    process.env.RATE_LIMIT_LIVE_MAX = String(limitOverrides.live || 1000);
    process.env.RATE_LIMIT_OTP_SEND_MAX = String(limitOverrides.otpSend || 1000);
    process.env.RATE_LIMIT_OTP_VERIFY_MAX = String(limitOverrides.otpVerify || 1000);
    process.env.RATE_LIMIT_AI_MAX = String(limitOverrides.ai || 1000);

    let freshApp;
    jest.isolateModules(() => {
      freshApp = require("../../app");
    });
    return freshApp;
  }

  // Test 1: /api/internships/live: N requests allowed, request N+1 returns 429 with a Retry-After header
  it("1. /api/internships/live: N requests allowed, request N+1 returns 429 with a Retry-After header", async () => {
    const N = 3;
    const app = getFreshApp({ live: N });
    const clientIp = "198.51.100.1";

    for (let i = 0; i < N; i++) {
      const res = await request(app)
        .get("/api/internships/live")
        .set("X-Forwarded-For", clientIp);
      expect(res.status).toBe(200);
    }

    const blockedRes = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", clientIp);

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.headers["retry-after"]).toBeDefined();
  });

  // Test 2: Two different IPs have separate buckets (IP A blocked, IP B still allowed)
  it("2. Two different IPs have separate buckets (IP A blocked, IP B still allowed)", async () => {
    const app = getFreshApp({ live: 1 });
    const ipA = "198.51.100.10";
    const ipB = "198.51.100.20";

    const resA1 = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", ipA);
    expect(resA1.status).toBe(200);

    const resA2 = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", ipA);
    expect(resA2.status).toBe(429);

    const resB1 = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", ipB);
    expect(resB1.status).toBe(200);
  });

  // Test 3: A spoofed X-Forwarded-For prefix ("<fake>, 203.0.113.50") does not bypass the limit
  it("3. A spoofed X-Forwarded-For prefix ('<fake>, 203.0.113.50') does not bypass the limit", async () => {
    const app = getFreshApp({ live: 1 });
    const realProxyClientIp = "203.0.113.50";

    const res1 = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", realProxyClientIp);
    expect(res1.status).toBe(200);

    // Attacker tries to spoof client IP by prepending a fake IP
    const spoofedHeader = `192.0.2.1, ${realProxyClientIp}`;
    const res2 = await request(app)
      .get("/api/internships/live")
      .set("X-Forwarded-For", spoofedHeader);

    expect(res2.status).toBe(429);
  });

  // Test 4: Global limiter returns 429 after its limit
  it("4. Global limiter returns 429 after its limit", async () => {
    const app = getFreshApp({ global: 2 });
    const clientIp = "198.51.100.30";

    const res1 = await request(app)
      .get("/api/_debug/ip")
      .set("X-Forwarded-For", clientIp);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .get("/api/_debug/ip")
      .set("X-Forwarded-For", clientIp);
    expect(res2.status).toBe(200);

    const res3 = await request(app)
      .get("/api/_debug/ip")
      .set("X-Forwarded-For", clientIp);
    expect(res3.status).toBe(429);
    expect(res3.body.message).toBe("Too many requests. Please try again later.");
  });

  // Test 5: /api/auth/send-otp returns 429 after its limit
  it("5. /api/auth/send-otp returns 429 after its limit", async () => {
    const app = getFreshApp({ otpSend: 2 });
    const clientIp = "198.51.100.40";

    const body = { email: "user@example.com" };

    const res1 = await request(app)
      .post("/api/auth/send-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post("/api/auth/send-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res2.status).toBe(200);

    const res3 = await request(app)
      .post("/api/auth/send-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res3.status).toBe(429);
    expect(res3.body.success).toBe(false);
  });

  // Test 6: /api/auth/verify-otp returns 429 after its limit
  it("6. /api/auth/verify-otp returns 429 after its limit", async () => {
    const app = getFreshApp({ otpVerify: 2 });
    const clientIp = "198.51.100.50";

    const body = { email: "user@example.com", otp: "123456" };

    const res1 = await request(app)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res2.status).toBe(400);

    const res3 = await request(app)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", clientIp)
      .send(body);
    expect(res3.status).toBe(429);
    expect(res3.body.success).toBe(false);
  });

  // Test 7: /api/ai/chat: user A blocked after the limit, user B on the same IP still allowed
  it("7. /api/ai/chat: user A blocked after the limit, user B on the same IP still allowed", async () => {
    const app = getFreshApp({ ai: 2 });
    const sharedIp = "198.51.100.60";

    const userA = "user-id-alpha";
    const userB = "user-id-beta";

    const resA1 = await request(app)
      .post("/api/ai/chat")
      .set("X-Forwarded-For", sharedIp)
      .set("x-test-user", userA)
      .send({ query: "Hello AI" });
    expect(resA1.status).toBe(200);

    const resA2 = await request(app)
      .post("/api/ai/chat")
      .set("X-Forwarded-For", sharedIp)
      .set("x-test-user", userA)
      .send({ query: "Hello again" });
    expect(resA2.status).toBe(200);

    // User A exceeds limit
    const resA3 = await request(app)
      .post("/api/ai/chat")
      .set("X-Forwarded-For", sharedIp)
      .set("x-test-user", userA)
      .send({ query: "Blocked query" });
    expect(resA3.status).toBe(429);

    // User B on SAME IP should still be allowed
    const resB1 = await request(app)
      .post("/api/ai/chat")
      .set("X-Forwarded-For", sharedIp)
      .set("x-test-user", userB)
      .send({ query: "Hello from User B" });
    expect(resB1.status).toBe(200);
  });

  // Test 8: OTP attempt counter locks after 5 wrong guesses (if implemented in F; mock the model as needed)
  it("8. OTP attempt counter locks after 5 wrong guesses", async () => {
    const app = getFreshApp({ otpVerify: 100 });
    const clientIp = "198.51.100.70";
    const targetEmail = "testlock@example.com";

    let attemptCount = 0;
    otpStore[targetEmail] = {
      _id: "pending-otp-id-999",
      email: targetEmail,
      purpose: "verification",
      otpHash: "valid-stored-hash-different-from-input",
      attempts: 0,
      save: jest.fn().mockImplementation(function () {
        attemptCount += 1;
        this.attempts = attemptCount;
        return Promise.resolve(this);
      }),
    };

    const PendingOTP = require("../../models/PendingOTP");

    // 4 wrong attempts return 400
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .set("X-Forwarded-For", clientIp)
        .send({ email: targetEmail, otp: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid or expired OTP");
    }

    // 5th wrong attempt locks and returns 429
    const lockRes = await request(app)
      .post("/api/auth/verify-otp")
      .set("X-Forwarded-For", clientIp)
      .send({ email: targetEmail, otp: "000000" });

    expect(lockRes.status).toBe(429);
    expect(lockRes.body.message).toBe(
      "Too many failed attempts. Please request a new OTP."
    );
    expect(mockDeleteOne).toHaveBeenCalledWith({ _id: "pending-otp-id-999" });
    expect(otpStore[targetEmail]).toBeUndefined();
  });
});
