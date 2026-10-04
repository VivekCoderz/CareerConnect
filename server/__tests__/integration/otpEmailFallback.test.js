// C01: signup OTPs fall back to a second HTTPS email provider when Brevo is out of quota.
jest.mock("sib-api-v3-sdk", () => {
  const sendTransacEmail = jest.fn();
  return {
    ApiClient: { instance: { authentications: { "api-key": {} } } },
    TransactionalEmailsApi: jest.fn(() => ({ sendTransacEmail })),
    SendSmtpEmail: jest.fn(() => ({})),
    __sendTransacEmail: sendTransacEmail,
  };
});
jest.mock("../../services/emailValidationService", () => ({
  ...jest.requireActual("../../services/emailValidationService"),
  validateEmail: jest.fn().mockImplementation(async (email) => ({
    isValid: true,
    normalizedEmail: email,
  })),
}));

const request = require("supertest");
const axios = require("axios");
const { __sendTransacEmail: brevoSend } = require("sib-api-v3-sdk");
const app = require("../../app");
const EmailUsage = require("../../models/EmailUsage");
const PendingOTP = require("../../models/PendingOTP");
const { istDay } = require("../../services/emailBudget");
const { warnOnFallbackEmailConfig } = require("../../utils/sendEmail");
const BREVO_KEY = "test-brevo-api-key-not-real";
const RESEND_KEY = "test-resend-api-key-not-real";
const MJ_USER = ["test", "user"].join("-");
const MJ_PASS = ["test", "pass"].join("-");
const STUDENT = "student@example.test";
const BUSY_MESSAGE =
  "Email sign-up is busy right now. Please use Continue with Google or try again later.";

const brevoQuotaError = () =>
  Object.assign(new Error("Payment Required"), {
    status: 402,
    response: {
      body: {
        code: "not_enough_credits",
        message: `Daily limit reached, could not send to ${STUDENT}`,
      },
    },
  });
const brevoRateLimitError = () =>
  Object.assign(new Error("Too Many Requests"), { status: 429 });
const resendError = () =>
  Object.assign(new Error("Request failed with status code 500"), {
    config: { headers: { Authorization: `Bearer ${RESEND_KEY}` } },
    response: {
      status: 500,
      data: { name: "application_error", message: "Internal server error" },
    },
  });

const sendOtp = () =>
  request(app)
    .post("/api/auth/send-otp")
    .send({ email: STUDENT, fullName: "Fake Student" });
const otpUsage = async () =>
  EmailUsage.findOne({ day: istDay(), kind: "otp" }).lean();

describe("signup OTP email fallback (C01)", () => {
  const ENV_KEYS = [
    "BREVO_API_KEY",
    "EMAIL_USER",
    "FALLBACK_EMAIL_PROVIDER",
    "FALLBACK_EMAIL_API_KEY",
    "FALLBACK_EMAIL_FROM",
    "BREVO_DAILY_LIMIT",
    "RATE_LIMIT_OTP_SEND_MAX",
    "BREVO_RATE_LIMIT_RETRY_MS",
  ];
  const savedEnv = {};
  let logs;
  let axiosPost;

  beforeEach(() => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    process.env.BREVO_API_KEY = BREVO_KEY;
    process.env.EMAIL_USER = "noreply@careerconnect.test";
    process.env.FALLBACK_EMAIL_PROVIDER = "resend";
    process.env.FALLBACK_EMAIL_API_KEY = RESEND_KEY;
    process.env.FALLBACK_EMAIL_FROM = "otp@mail.careerconnect.test";
    delete process.env.BREVO_DAILY_LIMIT;
    process.env.RATE_LIMIT_OTP_SEND_MAX = "100"; // this file sends more OTPs than the per-IP limit
    process.env.BREVO_RATE_LIMIT_RETRY_MS = "0"; // no real wait before the 429 retry

    brevoSend.mockReset().mockResolvedValue({ messageId: "brevo-1" });
    axiosPost = jest
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { id: "resend-1" } });

    logs = [];
    for (const level of ["log", "info", "warn", "error"]) {
      jest.spyOn(console, level).mockImplementation((...args) => {
        logs.push(
          args
            .map((a) =>
              typeof a === "string" ? a : (JSON.stringify(a) ?? String(a)),
            )
            .join(" "),
        );
      });
    }
  });

  afterEach(() => {
    // No scenario may leak an API key or a full student address into the logs.
    const output = logs.join("\n");
    expect(output).not.toContain(BREVO_KEY);
    expect(output).not.toContain(RESEND_KEY);
    expect(output).not.toContain(STUDENT);

    jest.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("uses only Brevo in the normal case and counts it as a Brevo OTP", async () => {
    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(1);
    expect(axiosPost).not.toHaveBeenCalled();
    expect(await otpUsage()).toMatchObject({
      count: 1,
      providers: { brevo: 1, resend: 0 },
    });
  });

  it("retries once with the fallback when Brevo returns a quota error", async () => {
    brevoSend.mockRejectedValueOnce(brevoQuotaError());

    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = axiosPost.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(body).toMatchObject({
      from: "CareerConnect <otp@mail.careerconnect.test>",
      to: [STUDENT],
    });
    expect(body.html).toMatch(/\d{6}/);
    expect(config.headers.Authorization).toBe(`Bearer ${RESEND_KEY}`);
    expect(await otpUsage()).toMatchObject({
      count: 1,
      providers: { brevo: 0, resend: 1 },
    });
    expect(logs.join("\n")).toContain("s***t@example.test");
  });

  it("skips Brevo once today's Brevo quota is used up", async () => {
    process.env.BREVO_DAILY_LIMIT = "300";
    await EmailUsage.create([
      { day: istDay(), kind: "notification", count: 150 },
      {
        day: istDay(),
        kind: "otp",
        count: 159,
        providers: { brevo: 149, resend: 10 },
      },
    ]);
    // 150 + 149 Brevo sends: one OTP left on Brevo, then the fallback takes over.
    expect((await sendOtp()).status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(1);

    await PendingOTP.deleteMany({});
    expect((await sendOtp()).status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(await otpUsage()).toMatchObject({
      count: 161,
      providers: { brevo: 150, resend: 11 },
    });
  });

  it("returns 503 with the Google hint when Brevo is out of quota and no fallback is configured", async () => {
    delete process.env.FALLBACK_EMAIL_PROVIDER;
    delete process.env.FALLBACK_EMAIL_API_KEY;
    brevoSend.mockRejectedValueOnce(brevoQuotaError());

    const res = await sendOtp();

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      code: "EMAIL_SIGNUP_BUSY",
      message: BUSY_MESSAGE,
    });
    expect(brevoSend).toHaveBeenCalledTimes(1);
    expect(axiosPost).not.toHaveBeenCalled();
    expect(await PendingOTP.countDocuments({})).toBe(0);
    expect(await otpUsage()).toBeNull();
  });

  it("still tries Brevo when its quota looks used but no fallback is configured", async () => {
    delete process.env.FALLBACK_EMAIL_PROVIDER;
    process.env.BREVO_DAILY_LIMIT = "0";

    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(1);
  });

  it("when the fallback fails, retries Brevo once, then returns 503", async () => {
    brevoSend
      .mockRejectedValueOnce(brevoQuotaError())
      .mockRejectedValueOnce(brevoQuotaError());
    axiosPost.mockRejectedValueOnce(resendError());

    const res = await sendOtp();

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      code: "EMAIL_SIGNUP_BUSY",
      message: BUSY_MESSAGE,
    });
    expect(brevoSend).toHaveBeenCalledTimes(2);
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(await PendingOTP.countDocuments({})).toBe(0);
    expect(await otpUsage()).toBeNull();
  });

  it("when the fallback fails, Brevo's last try can still send the OTP", async () => {
    brevoSend.mockRejectedValueOnce(brevoQuotaError());
    axiosPost.mockRejectedValueOnce(resendError());

    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(2);
    expect(await otpUsage()).toMatchObject({ count: 1, providers: { brevo: 1, resend: 0 } });
  });

  it("a 429 rate limit retries Brevo once and does not use the fallback", async () => {
    brevoSend.mockRejectedValueOnce(brevoRateLimitError());

    const res = await sendOtp();

    expect(res.status).toBe(200);
    expect(brevoSend).toHaveBeenCalledTimes(2);
    expect(axiosPost).not.toHaveBeenCalled();
    expect(await otpUsage()).toMatchObject({ providers: { brevo: 1, resend: 0 } });
  });

  it("a 429 on the retry too gives 503, still without the fallback", async () => {
    brevoSend
      .mockRejectedValueOnce(brevoRateLimitError())
      .mockRejectedValueOnce(brevoRateLimitError());

    const res = await sendOtp();

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("EMAIL_SIGNUP_BUSY");
    expect(brevoSend).toHaveBeenCalledTimes(2);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it("does not use the fallback for non-quota Brevo errors", async () => {
    brevoSend.mockRejectedValueOnce(
      Object.assign(new Error("Bad Request"), {
        status: 400,
        response: {
          body: { code: "invalid_parameter", message: "sender not valid" },
        },
      }),
    );

    const res = await sendOtp();

    expect(res.status).toBe(503);
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it("supports Mailjet as the fallback", async () => {
    process.env.FALLBACK_EMAIL_PROVIDER = "mailjet";
    process.env.FALLBACK_EMAIL_API_KEY = `${MJ_USER}:${MJ_PASS}`;
    brevoSend.mockRejectedValueOnce(brevoQuotaError());
    axiosPost.mockResolvedValueOnce({
      data: { Messages: [{ Status: "success", To: [{ MessageID: 42 }] }] },
    });

    const res = await sendOtp();

    expect(res.status).toBe(200);
    const [url, body, config] = axiosPost.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(body.Messages[0].To).toEqual([{ Email: STUDENT }]);
    expect(config.auth).toEqual({
      username: MJ_USER,
      password: MJ_PASS,
    });
    expect(await otpUsage()).toMatchObject({ providers: { mailjet: 1 } });
    expect(logs.join("\n")).not.toContain(MJ_PASS);
  });
});

describe("fallback email config warning at startup (C01)", () => {
  const NAMES = ["FALLBACK_EMAIL_PROVIDER", "FALLBACK_EMAIL_API_KEY", "FALLBACK_EMAIL_FROM"];
  const FAKE_KEY = "test-fallback-key-not-real";
  const saved = {};
  let warnings;

  beforeEach(() => {
    for (const name of NAMES) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
    warnings = [];
    jest.spyOn(console, "warn").mockImplementation((...args) => warnings.push(args.join(" ")));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const name of NAMES) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("says nothing when the fallback is fully set or not set at all", () => {
    expect(warnOnFallbackEmailConfig()).toBeNull();
    process.env.FALLBACK_EMAIL_PROVIDER = "resend";
    process.env.FALLBACK_EMAIL_API_KEY = FAKE_KEY;
    process.env.FALLBACK_EMAIL_FROM = "otp@mail.careerconnect.test";
    expect(warnOnFallbackEmailConfig()).toBeNull();
    expect(warnings).toEqual([]);
  });

  it("warns once, naming what is missing, without logging the key", () => {
    process.env.FALLBACK_EMAIL_API_KEY = FAKE_KEY;
    expect(() => warnOnFallbackEmailConfig()).not.toThrow();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/missing FALLBACK_EMAIL_PROVIDER, FALLBACK_EMAIL_FROM/);
    expect(warnings[0]).not.toContain(FAKE_KEY);
  });

  it("warns about an unknown provider name", () => {
    process.env.FALLBACK_EMAIL_PROVIDER = "fake-mailer";
    process.env.FALLBACK_EMAIL_API_KEY = FAKE_KEY;
    process.env.FALLBACK_EMAIL_FROM = "otp@mail.careerconnect.test";
    warnOnFallbackEmailConfig();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/must be one of: resend, mailjet/);
    expect(warnings[0]).not.toContain(FAKE_KEY);
  });
});
