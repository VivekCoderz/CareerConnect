const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { authCookieOptions, authCookieBaseOptions } = require("../../utils/authCookies");
const { createTestUser } = require("../helpers/createTestUser");

const PASSWORD = "Password@123";

const withEnv = async (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const setCookies = (res) => [].concat(res.headers["set-cookie"] || []);
const cookieNamed = (res, name) => setCookies(res).find((c) => c.startsWith(`${name}=`));

describe("admin JWT and cookies (S09)", () => {
  let admin;
  let otherAdmin;

  beforeEach(async () => {
    admin = await createTestUser({ email: "s09-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });
    otherAdmin = await createTestUser({ email: "s09-other@example.com", role: "SUPER_ADMIN", userType: "admin" });
  });

  const login = (user) =>
    request(app).post("/api/admin/login").send({ email: user.email, password: PASSWORD });
  const me = (token) => request(app).get("/api/admin/me").set("Authorization", `Bearer ${token}`);
  const meWithCookie = (token) => request(app).get("/api/admin/me").set("Cookie", `token=${token}`);

  const resetPassword = async (user) => {
    const { code } = await issueOtp(user.email, "reset-password");
    const verificationToken = await verifyOtp(user.email, "reset-password", code);
    const res = await request(app).post("/api/auth/reset-password").send({
      email: user.email,
      verificationToken,
      password: "NewPassword@456",
      confirmPassword: "NewPassword@456",
    });
    expect(res.status).toBe(200);
  };

  it("includes the admin's authVersion as av in the token", async () => {
    await User.updateOne({ _id: admin._id }, { authVersion: 3 });

    const res = await login(admin);
    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.av).toBe(3);
    expect(String(decoded.id)).toBe(String(admin._id));
    expect(jwt.verify(cookieNamed(res, "token").split(";")[0].slice(6), process.env.JWT_SECRET).av).toBe(3);
  });

  it("revokes the old admin token after a password reset, and a new login works", async () => {
    const { token } = (await login(admin)).body;
    expect((await me(token)).status).toBe(200);

    await resetPassword(admin);

    expect((await me(token)).status).toBe(401);
    expect((await meWithCookie(token)).status).toBe(401);

    const relogin = await request(app)
      .post("/api/admin/login")
      .send({ email: admin.email, password: "NewPassword@456" });
    expect(relogin.status).toBe(200);
    expect((await me(relogin.body.token)).status).toBe(200);
  });

  it("keeps an admin logged in when another admin resets their password", async () => {
    const { token } = (await login(admin)).body;

    await resetPassword(otherAdmin);

    expect((await me(token)).status).toBe(200);
  });

  describe("cookie options", () => {
    it("uses SameSite=None, Secure and HttpOnly in production", async () => {
      await expect(withEnv({ NODE_ENV: "production" }, () => authCookieOptions(1000))).resolves.toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });

      const res = await withEnv({ NODE_ENV: "production" }, () => login(admin));
      expect(res.status).toBe(200);
      for (const name of ["admin_token", "token"]) {
        const cookie = cookieNamed(res, name);
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/Secure/i);
        expect(cookie).toMatch(/SameSite=None/i);
        expect(cookie).toMatch(/Path=\//);
      }
    });

    it("uses SameSite=Lax without Secure in development", async () => {
      const res = await login(admin);
      const cookie = cookieNamed(res, "token");
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).not.toMatch(/Secure/i);
      expect(cookie).toMatch(/HttpOnly/i);
    });

    it("clears both admin cookies on logout with matching options", async () => {
      const res = await withEnv({ NODE_ENV: "production" }, () =>
        request(app).post("/api/admin/logout").send({})
      );

      expect(res.status).toBe(200);
      for (const name of ["admin_token", "token"]) {
        const cookie = cookieNamed(res, name);
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
        expect(cookie).toMatch(/Path=\//);
        expect(cookie).toMatch(/SameSite=None/i);
        expect(cookie).toMatch(/Secure/i);
        expect(cookie).toMatch(/HttpOnly/i);
      }
      await expect(withEnv({ NODE_ENV: "production" }, () => authCookieBaseOptions())).resolves.toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });
    });
  });
});
