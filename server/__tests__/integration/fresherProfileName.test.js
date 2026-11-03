// Bug 2: the name saved on the fresher profile page is the account name the dashboard shows.
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const { createUserWithToken } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

describe("PATCH /api/fresher/profile fullName", () => {
  let fresher;

  beforeEach(async () => {
    fresher = await createUserWithToken({
      email: "bug2-fresher@example.com",
      userType: "fresher",
      fullName: "Google Name",
    });
  });

  it("updates the account name used by /auth/me and the dashboard greeting", async () => {
    const res = await request(app)
      .patch("/api/fresher/profile")
      .set(auth(fresher))
      .send({ fullName: "  Priya   Sharma " });

    expect(res.status).toBe(200);
    expect((await User.findById(fresher.user._id)).fullName).toBe("Priya Sharma");

    const me = await request(app).get("/api/auth/me").set(auth(fresher));
    expect(me.body.user.fullName).toBe("Priya Sharma");

    const dashboard = await request(app).get("/api/fresher/dashboard").set(auth(fresher));
    expect(dashboard.body.data.user.fullName).toBe("Priya Sharma");
  });

  it.each([
    ["empty", ""],
    ["one character", " A "],
    ["too long", "x".repeat(101)],
    ["not a string", { first: "Priya" }],
  ])("rejects a name that is %s and keeps the old one", async (_label, fullName) => {
    const res = await request(app)
      .patch("/api/fresher/profile")
      .set(auth(fresher))
      .send({ fullName });

    expect(res.status).toBe(400);
    expect((await User.findById(fresher.user._id)).fullName).toBe("Google Name");
  });

  it("does not send an onboarded fresher back to onboarding when the profile is still sparse", async () => {
    const res = await request(app)
      .patch("/api/fresher/profile")
      .set(auth(fresher))
      .send({ fullName: "Priya Sharma" });

    expect(res.status).toBe(200);
    expect(res.body.profileCompletion).toBeLessThan(75);
    const me = await request(app).get("/api/auth/me").set(auth(fresher));
    expect(me.body.user.isProfileComplete).toBe(true);
  });

  it("leaves the name alone when the update does not include it", async () => {
    const res = await request(app)
      .patch("/api/fresher/profile")
      .set(auth(fresher))
      .send({ careerGoal: "Get my first job" });

    expect(res.status).toBe(200);
    expect((await User.findById(fresher.user._id)).fullName).toBe("Google Name");
  });
});
