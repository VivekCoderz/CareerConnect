const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../app");
const User = require("../../models/User");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { createTestUser } = require("../helpers/createTestUser");

// H09: the httpOnly `token` cookie is the only login path. Logout and password reset
// revoke old tokens through authVersion, and no server-side session is stored.
const EMAIL = "h09-candidate@example.com";
const PASSWORD = "Password@123";
const NEW_PASSWORD = "NewPassword@456";

const tokenOf = (res) =>
  [].concat(res.headers["set-cookie"] || []).find((c) => c.startsWith("token=")).split(";")[0].slice("token=".length);
const login = (password = PASSWORD) => request(app).post("/api/auth/login").send({ emailOrUsername: EMAIL, password });
const me = (token) => request(app).get("/api/auth/me").set("Cookie", `token=${token}`);
const logout = (token) => request(app).post("/api/auth/logout").set("Cookie", `token=${token}`);

describe("one login path (H09)", () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser({ email: EMAIL, password: PASSWORD, phone: "9100000009" });
  });

  it("rejects an old cookie after a password reset", async () => {
    const oldToken = tokenOf(await login());
    expect((await me(oldToken)).status).toBe(200);

    const { code } = await issueOtp(EMAIL, "reset-password");
    const verificationToken = await verifyOtp(EMAIL, "reset-password", code);
    const reset = await request(app).post("/api/auth/reset-password").send({
      email: EMAIL,
      verificationToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);

    const res = await me(oldToken);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
    expect((await me(tokenOf(await login(NEW_PASSWORD)))).status).toBe(200);
  });

  it("revokes the token on logout, so a saved copy of the cookie stops working", async () => {
    const token = tokenOf(await login());

    const out = await logout(token);
    expect(out.status).toBe(200);

    expect((await me(token)).status).toBe(401);
    expect((await me(tokenOf(await login()))).status).toBe(200);
  });

  it("doesn't let an already-revoked token log out a newer login", async () => {
    const oldToken = tokenOf(await login());
    await logout(oldToken);
    const freshToken = tokenOf(await login());

    expect((await logout(oldToken)).status).toBe(200);

    expect((await me(freshToken)).status).toBe(200);
  });

  it("revokes tokens for accounts stored before authVersion existed", async () => {
    await User.collection.updateOne({ _id: user._id }, { $unset: { authVersion: "" } });
    const token = tokenOf(await login());

    await logout(token);

    expect((await me(token)).status).toBe(401);
  });

  it("ignores the token in an Authorization header", async () => {
    const token = tokenOf(await login());

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("NOT_AUTHENTICATED");
  });

  it("stores no server-side session on login", async () => {
    await login().expect(200);

    const sessions = await mongoose.connection.db.listCollections({ name: "sessions" }).toArray();
    if (sessions.length) {
      expect(await mongoose.connection.db.collection("sessions").countDocuments()).toBe(0);
    }
    expect([].concat((await login()).headers["set-cookie"] || []).some((c) => c.startsWith("sid="))).toBe(false);
  });
});
