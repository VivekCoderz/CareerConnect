jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
jest.mock("../../services/emailValidationService", () => ({
  validateEmail: jest.fn().mockImplementation(async (email) => ({ isValid: true, normalizedEmail: email })),
  maskEmail: (email) => email,
}));

const request = require("supertest");
const app = require("../../app");
const sendEmail = require("../../utils/sendEmail");
const User = require("../../models/User");
const EmployerProfile = require("../../models/EmployerProfile");

// Flow 2: a new user verifies their email, must agree to the Terms and Privacy Policy, and
// the agreement is stored on the account (G05, DPDP Act).
const TERMS_VERSION = "2026-10-01";
const CONSENT = { acceptedTerms: true, termsVersion: TERMS_VERSION };
const PASSWORD = "Password@123";

// Reads the 6-digit code out of the verification email the server sent.
const sentOtp = (email) => {
  const mail = sendEmail.mock.calls.map(([msg]) => msg).filter((msg) => msg.to === email).pop();
  return mail && mail.html.match(/>\s*(\d{6})\s*</)[1];
};

// What the signup form does before the final submit: request a code, then enter it.
const verifyEmail = async (email) => {
  const sent = await request(app).post("/api/auth/send-otp").send({ email, fullName: "Asha Rao" });
  expect(sent.status).toBe(200);
  const verified = await request(app).post("/api/auth/verify-otp").send({ email, otp: sentOtp(email) });
  expect(verified.status).toBe(200);
  return verified.body.verificationToken;
};

const candidateForm = (email, verificationToken, extra = {}) => ({
  firstName: "Asha",
  lastName: "Rao",
  email,
  verificationToken,
  phone: "9123450001",
  password: PASSWORD,
  confirmPassword: PASSWORD,
  type: "student",
  college: "Test University",
  course: "B.Tech",
  ...extra,
});

beforeEach(() => sendEmail.mockClear());

describe("signup with consent flow", () => {
  it("creates a candidate who agreed, stores the consent, and lets them sign in", async () => {
    const email = "flow-signup@example.com";
    const verificationToken = await verifyEmail(email);
    const before = Date.now();

    const res = await request(app).post("/api/auth/register").send(candidateForm(email, verificationToken, CONSENT));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(email);

    const saved = await User.findOne({ email }).lean();
    expect(saved).toBeTruthy();
    expect(saved.userType).toBe("student");
    expect(saved.consent.termsVersion).toBe(TERMS_VERSION);
    const acceptedAt = new Date(saved.consent.acceptedAt).getTime();
    expect(acceptedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(acceptedAt).toBeLessThanOrEqual(Date.now() + 1000);
    // The password is stored hashed, never as typed.
    const withPassword = await User.findById(saved._id).select("+password").lean();
    expect(withPassword.password).not.toBe(PASSWORD);

    const login = await request(app).post("/api/auth/login").send({ emailOrUsername: email, password: PASSWORD });
    expect(login.status).toBe(200);
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it.each([
    ["missing", {}],
    ["false", { acceptedTerms: false, termsVersion: TERMS_VERSION }],
    ["a truthy string instead of true", { acceptedTerms: "true", termsVersion: TERMS_VERSION }],
    ["given without a terms version", { acceptedTerms: true }],
  ])("refuses signup when consent is %s and creates no account", async (_label, consent) => {
    const email = "flow-no-consent@example.com";
    const verificationToken = await verifyEmail(email);

    const res = await request(app).post("/api/auth/register").send(candidateForm(email, verificationToken, consent));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CONSENT_REQUIRED");
    expect(res.body.field).toBe("acceptedTerms");
    expect(await User.countDocuments({ email })).toBe(0);
  });

  it("lets the user tick the box and submit again with the same verified email", async () => {
    const email = "flow-retry@example.com";
    const verificationToken = await verifyEmail(email);

    const refused = await request(app).post("/api/auth/register").send(candidateForm(email, verificationToken));
    expect(refused.status).toBe(400);

    const accepted = await request(app).post("/api/auth/register").send(candidateForm(email, verificationToken, CONSENT));
    expect(accepted.status).toBe(201);
    expect((await User.findOne({ email }).lean()).consent.termsVersion).toBe(TERMS_VERSION);
  });

  it("does not accept consent without a verified email", async () => {
    const res = await request(app).post("/api/auth/register")
      .send(candidateForm("flow-unverified@example.com", "f".repeat(64), CONSENT));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await User.countDocuments({ email: "flow-unverified@example.com" })).toBe(0);
  });

  describe("employer signup", () => {
    const employerForm = (email, verificationToken, extra = {}) => ({
      companyName: "Flow Consent Co",
      email,
      verificationToken,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      contactPerson: "Pat Recruiter",
      designation: "HR",
      companyType: "Private",
      industry: "Technology",
      location: "Pune",
      ...extra,
    });

    it("refuses an employer without consent and creates neither the user nor the company", async () => {
      const email = "flow-employer-no-consent@example.com";
      const verificationToken = await verifyEmail(email);

      const res = await request(app).post("/api/auth/register-employer").send(employerForm(email, verificationToken));

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
      expect(await User.countDocuments({ email })).toBe(0);
      expect(await EmployerProfile.countDocuments({ companyName: "Flow Consent Co" })).toBe(0);
    });

    it("stores consent for an employer who agreed", async () => {
      const email = "flow-employer@example.com";
      const verificationToken = await verifyEmail(email);

      const res = await request(app).post("/api/auth/register-employer").send(employerForm(email, verificationToken, CONSENT));

      expect(res.status).toBe(201);
      const saved = await User.findOne({ email }).lean();
      expect(saved.role).toBe("employer");
      expect(saved.consent.termsVersion).toBe(TERMS_VERSION);
      expect(saved.consent.acceptedAt).toBeTruthy();
    });
  });
});
