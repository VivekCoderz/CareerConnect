const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { createUserWithToken } = require("../helpers/createTestUser");

// Bug 4: a fresher has at most 2 years of work experience, on both signup paths.
const CONSENT = { acceptedTerms: true, termsVersion: "2026-10-01" };

let seq = 0;
const verifiedEmail = async () => {
  seq += 1;
  const email = `fresher-exp-${seq}@example.com`;
  const { code } = await issueOtp(email, "verification");
  return { email, verificationToken: await verifyOtp(email, "verification", code) };
};

const register = (email, verificationToken, extra) =>
  request(app).post("/api/auth/register").send({
    firstName: "Asha",
    lastName: "Rao",
    email,
    verificationToken,
    phone: `91234570${String(seq).padStart(2, "0")}`,
    password: "Password@123",
    confirmPassword: "Password@123",
    ...CONSENT,
    ...extra,
  });

describe("fresher work experience (bug 4)", () => {
  describe("POST /api/auth/register", () => {
    it("refuses a fresher with more than 2 years and keeps the verified email usable", async () => {
      const { email, verificationToken } = await verifiedEmail();

      const refused = await register(email, verificationToken, { type: "fresher", workExperience: "4 years" });
      expect(refused.status).toBe(400);
      expect(refused.body.field).toBe("workExperience");
      expect(await User.countDocuments({ email })).toBe(0);

      // The user picks a valid value and submits again without a new email code.
      const accepted = await register(email, verificationToken, { type: "fresher", workExperience: "2 years" });
      expect(accepted.status).toBe(201);
      const user = await User.findOne({ email }).lean();
      expect(user.userType).toBe("fresher");
      expect(user.workExperience).toBe("2 years");
    });

    it("still allows more than 2 years for a working professional", async () => {
      const { email, verificationToken } = await verifiedEmail();
      const res = await register(email, verificationToken, { type: "professional", workExperience: "5+ years" });
      expect(res.status).toBe(201);
    });
  });

  describe("POST /api/auth/google-onboarding", () => {
    const onboarding = {
      firstName: "Ravi",
      lastName: "Kumar",
      phone: "9123470001",
      type: "fresher",
      college: "Test University",
      course: "B.Tech",
      ...CONSENT,
    };
    const newGoogleUser = () =>
      createUserWithToken({ phone: "", isProfileComplete: false, authProviders: ["google"] });
    const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

    it("refuses a fresher with more than 2 years and leaves the profile unfinished", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/google-onboarding").set(auth(googleUser))
        .send({ ...onboarding, workExperience: "3 years" });

      expect(res.status).toBe(400);
      expect(res.body.field).toBe("workExperience");
      expect((await User.findById(googleUser.user._id).lean()).isProfileComplete).toBe(false);
    });

    it("accepts a fresher with up to 2 years", async () => {
      const googleUser = await newGoogleUser();
      const res = await request(app).post("/api/auth/google-onboarding").set(auth(googleUser))
        .send({ ...onboarding, workExperience: "1 year" });

      expect(res.status).toBe(200);
      expect((await User.findById(googleUser.user._id).lean()).workExperience).toBe("1 year");
    });
  });
});
