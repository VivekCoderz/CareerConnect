// Bug 13: the start year given at signup reaches the profile's education, and the
// profile page can save it (the education schema used to drop startYear).
const request = require("supertest");
const app = require("../../app");
const FresherProfile = require("../../models/FresherProfile");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { createUserWithToken } = require("../helpers/createTestUser");

const CONSENT = { acceptedTerms: true, termsVersion: "2026-10-01" };
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

const verifiedEmail = async (email) => {
  const { code } = await issueOtp(email, "verification");
  return verifyOtp(email, "verification", code);
};

describe("fresher education start year", () => {
  it("copies the signup start and end year into the profile education", async () => {
    const email = "bug13-signup@example.com";
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Asha",
      lastName: "Rao",
      email,
      verificationToken: await verifiedEmail(email),
      phone: "9123450013",
      password: "Password@123",
      confirmPassword: "Password@123",
      type: "fresher",
      college: "Test University",
      course: "B.Tech",
      startYear: "2024",
      endYear: "2028",
      ...CONSENT,
    });

    expect(res.status).toBe(201);
    const profile = await FresherProfile.findOne({ userId: res.body.user._id }).lean();
    expect(profile.education[0]).toMatchObject({ startYear: 2024, graduationYear: 2028 });
  });

  it("copies the start year from Google onboarding too", async () => {
    const googleUser = await createUserWithToken({
      email: "bug13-google@example.com",
      phone: "",
      isProfileComplete: false,
      authProviders: ["google"],
    });
    const res = await request(app).post("/api/auth/google-onboarding").set(auth(googleUser)).send({
      firstName: "Ravi",
      lastName: "Kumar",
      phone: "9123400013",
      type: "fresher",
      college: "Test University",
      course: "B.Tech",
      startYear: "2023",
      endYear: "2027",
      ...CONSENT,
    });

    expect(res.status).toBe(200);
    const profile = await FresherProfile.findOne({ userId: googleUser.user._id }).lean();
    expect(profile.education[0]).toMatchObject({ startYear: 2023, graduationYear: 2027 });
  });

  it("saves a start year entered on the profile page", async () => {
    const fresher = await createUserWithToken({ email: "bug13-profile@example.com", userType: "fresher" });
    const res = await request(app)
      .put("/api/fresher/profile")
      .set(auth(fresher))
      .send({
        education: [
          { degree: "B.Tech", institution: "Test University", startYear: 2022, graduationYear: 2026, isHighest: true },
        ],
      });

    expect(res.status).toBe(200);
    const profile = await FresherProfile.findOne({ userId: fresher.user._id }).lean();
    expect(profile.education[0]).toMatchObject({ startYear: 2022, graduationYear: 2026 });
  });
});
