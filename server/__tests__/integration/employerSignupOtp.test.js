const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const EmployerProfile = require("../../models/EmployerProfile");
const PendingOTP = require("../../models/PendingOTP");
const { issueOtp, verifyOtp, consumeVerifiedOtp } = require("../../services/otpService");
const { createUserWithToken } = require("../helpers/createTestUser");

// Employer signup: the mobile number is optional, a signup code expires after one minute,
// and a code once accepted stays usable while the employer finishes the form.
const CONSENT = { acceptedTerms: true, termsVersion: "2026-10-01" };
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const MINUTE = 60 * 1000;

let seq = 0;
const verifiedEmail = async () => {
  seq += 1;
  const email = `optional-phone-${seq}@example.com`;
  const { code } = await issueOtp(email, "verification");
  return { email, verificationToken: await verifyOtp(email, "verification", code) };
};

const registerEmployer = async (extra = {}) => {
  const { email, verificationToken } = await verifiedEmail();
  return request(app).post("/api/auth/register-employer").send({
    companyName: "Optional Phone Co",
    email,
    verificationToken,
    password: "Password@123",
    confirmPassword: "Password@123",
    contactPerson: "Pat Recruiter",
    designation: "HR",
    companyType: "Private",
    industry: "Technology",
    location: "Pune",
    ...CONSENT,
    ...extra,
  });
};

const expiresInMs = async (email) => (await PendingOTP.findOne({ email }).lean()).expiresAt.getTime() - Date.now();

describe("employer signup without a mobile number", () => {
  it("creates the employer with no phone and marks signup finished", async () => {
    const res = await registerEmployer();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ phone: "", onboardingComplete: true });
    const user = await User.findById(res.body.user._id).lean();
    expect(user.phone).toBe("");
    expect(user.onboardingCompletedAt).toBeTruthy();
    const profile = await EmployerProfile.findOne({ userId: user._id }).lean();
    expect(profile.mobile).toBe("");

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ phone: "", onboardingComplete: true });
  });

  it("still checks a mobile number when one is given", async () => {
    const invalid = await registerEmployer({ phone: "12345" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.field).toBe("phone");

    const valid = await registerEmployer({ phone: "9876543210" });
    expect(valid.status).toBe(201);
    expect(valid.body.user.phone).toBe("9876543210");

    const taken = await registerEmployer({ phone: "9876543210" });
    expect(taken.status).toBe(409);
    expect(taken.body.field).toBe("phone");
  });

  it("lets a Google employer finish onboarding without a phone", async () => {
    const googleUser = await createUserWithToken({ phone: "", isProfileComplete: false, authProviders: ["google"] });
    const res = await request(app)
      .post("/api/auth/complete-employer-google-onboarding")
      .set(auth(googleUser))
      .send({ companyName: "Google Co", contactPerson: "G Recruiter", designation: "HR", industry: "IT", location: "Delhi", ...CONSENT });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ phone: "", role: "employer", onboardingComplete: true });
  });
});

describe("signup email codes", () => {
  it("expire one minute after they are sent", async () => {
    const email = "otp-expiry@example.com";
    const { code } = await issueOtp(email, "verification");
    const ttl = await expiresInMs(email);
    expect(ttl).toBeGreaterThan(MINUTE - 5000);
    expect(ttl).toBeLessThanOrEqual(MINUTE);

    // A minute later the same correct code is refused.
    await PendingOTP.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post("/api/auth/verify-otp").send({ email, otp: code });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("keep password reset codes at ten minutes", async () => {
    const email = "otp-reset@example.com";
    await issueOtp(email, "reset-password");
    expect(await expiresInMs(email)).toBeGreaterThan(9 * MINUTE);
  });

  it("stay usable for 30 minutes after the code is accepted, so going back a step needs no new code", async () => {
    const email = "otp-verified@example.com";
    const { code } = await issueOtp(email, "verification");
    const token = await verifyOtp(email, "verification", code);
    expect(token).toBeTruthy();

    const ttl = await expiresInMs(email);
    expect(ttl).toBeGreaterThan(29 * MINUTE);
    expect(ttl).toBeLessThanOrEqual(30 * MINUTE);
    expect(await consumeVerifiedOtp(email, "verification", token)).toBe(true);
    // Single use.
    expect(await consumeVerifiedOtp(email, "verification", token)).toBe(false);
  });
});
