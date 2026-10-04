const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const EmployerProfile = require("../../models/EmployerProfile");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { createUserWithToken, createEmployerProfile } = require("../helpers/createTestUser");

// G05: new accounts must agree to the Terms and Privacy Policy, and the server stores it.
const CONSENT = { acceptedTerms: true, termsVersion: "2026-10-01" };
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

let seq = 0;
const verifiedEmail = async (prefix) => {
  seq += 1;
  const email = `${prefix}-${seq}@example.com`;
  const { code } = await issueOtp(email, "verification");
  return { email, verificationToken: await verifyOtp(email, "verification", code) };
};

const registerCandidate = async (extra = {}) => {
  const { email, verificationToken } = await verifiedEmail("consent-student");
  return request(app).post("/api/auth/register").send({
    firstName: "Asha",
    lastName: "Rao",
    email,
    verificationToken,
    phone: `91234567${String(seq).padStart(2, "0")}`,
    password: "Password@123",
    confirmPassword: "Password@123",
    type: "student",
    ...extra,
  });
};

const registerEmployer = async (extra = {}) => {
  const { email, verificationToken } = await verifiedEmail("consent-employer");
  return request(app).post("/api/auth/register-employer").send({
    companyName: "Consent Co",
    email,
    verificationToken,
    phone: `98765433${String(seq).padStart(2, "0")}`,
    password: "Password@123",
    confirmPassword: "Password@123",
    contactPerson: "Pat Recruiter",
    designation: "HR",
    companyType: "Private",
    industry: "Technology",
    location: "Pune",
    ...extra,
  });
};

// A Google user right after /google-auth: no phone, profile not complete yet.
const newGoogleUser = (overrides = {}) =>
  createUserWithToken({ phone: "", isProfileComplete: false, authProviders: ["google"], ...overrides });

const candidateOnboarding = {
  firstName: "Ravi",
  lastName: "Kumar",
  phone: "9123400001",
  type: "student",
  college: "Test University",
  course: "B.Tech",
};
const employerOnboarding = {
  phone: "9876500001",
  companyName: "Google Co",
  contactPerson: "G Recruiter",
  designation: "HR",
  industry: "IT",
  location: "Delhi",
};

describe("signup consent (G05)", () => {
  describe("POST /api/auth/register (candidate)", () => {
    it("returns 400 without acceptedTerms and creates no account", async () => {
      const res = await registerCandidate();
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
      expect(await User.countDocuments({ email: /consent-student/ })).toBe(0);
    });

    it("returns 400 when acceptedTerms is not exactly true", async () => {
      const res = await registerCandidate({ acceptedTerms: "yes", termsVersion: "2026-10-01" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
    });

    it("saves the terms version and acceptance time with acceptedTerms", async () => {
      const before = Date.now();
      const res = await registerCandidate(CONSENT);
      expect(res.status).toBe(201);
      const user = await User.findById(res.body.user._id).lean();
      expect(user.consent.termsVersion).toBe("2026-10-01");
      expect(new Date(user.consent.acceptedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });
  });

  describe("POST /api/auth/register-employer", () => {
    it("returns 400 without acceptedTerms and creates no account", async () => {
      const res = await registerEmployer();
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
      expect(await User.countDocuments({ email: /consent-employer/ })).toBe(0);
    });

    it("saves consent with acceptedTerms", async () => {
      const res = await registerEmployer(CONSENT);
      expect(res.status).toBe(201);
      const user = await User.findById(res.body.user._id).lean();
      expect(user.consent.termsVersion).toBe("2026-10-01");
      expect(user.consent.acceptedAt).toBeTruthy();
    });
  });

  describe("Google candidate signup (POST /api/auth/google-onboarding)", () => {
    it("returns 400 for a new Google user without acceptedTerms", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/google-onboarding").set(auth(googleUser)).send(candidateOnboarding);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
      expect((await User.findById(googleUser.user._id).lean()).isProfileComplete).toBe(false);
    });

    it("saves consent for a new Google user with acceptedTerms", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/google-onboarding").set(auth(googleUser)).send({ ...candidateOnboarding, ...CONSENT });
      expect(res.status).toBe(200);
      const user = await User.findById(googleUser.user._id).lean();
      expect(user.consent.termsVersion).toBe("2026-10-01");
      expect(user.consent.acceptedAt).toBeTruthy();
    });

    it("does not ask a user whose profile was completed before consent existed", async () => {
      const existing = await createUserWithToken({ phone: "9123400002" });
      const res = await request(app).post("/api/auth/google-onboarding").set(auth(existing)).send({ ...candidateOnboarding, phone: "9123400002" });
      expect(res.status).not.toBe(400);
    });
  });

  describe("Google employer signup (POST /api/auth/complete-employer-google-onboarding)", () => {
    it("returns 400 for a new Google employer without acceptedTerms", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/complete-employer-google-onboarding").set(auth(googleUser)).send(employerOnboarding);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONSENT_REQUIRED");
      expect(await EmployerProfile.countDocuments({ userId: googleUser.user._id })).toBe(0);
    });

    it("saves consent for a new Google employer with acceptedTerms", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/complete-employer-google-onboarding").set(auth(googleUser)).send({ ...employerOnboarding, ...CONSENT });
      expect(res.status).toBe(200);
      const user = await User.findById(googleUser.user._id).lean();
      expect(user.consent.termsVersion).toBe("2026-10-01");
    });

    it("does not ask an employer whose company profile already exists", async () => {
      const existing = await newGoogleUser({ role: "employer", userType: "employer" });
      await createEmployerProfile(existing.user._id);
      const res = await request(app).post("/api/auth/complete-employer-google-onboarding").set(auth(existing)).send(employerOnboarding);
      expect(res.status).toBe(200);
    });
  });

  it("lets an existing user without consent log in", async () => {
    const { user } = await createUserWithToken({ email: "before-consent@example.com" });
    expect(user.consent?.acceptedAt).toBeUndefined();
    const res = await request(app).post("/api/auth/login").send({ emailOrUsername: "before-consent@example.com", password: "Password@123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
