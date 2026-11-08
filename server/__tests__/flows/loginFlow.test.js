const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const { createTestUser } = require("../helpers/createTestUser");

// Flow 1: a candidate signs in with email + password and uses the session it gets back.
const EMAIL = "flow-login@example.com";
const PASSWORD = "Password@123";

const login = (agent, body) => agent.post("/api/auth/login").send(body);
const tokenCookie = (res) => (res.headers["set-cookie"] || []).find((c) => c.startsWith("token="));
// The JWT is sent only in the httpOnly cookie (H07), never in the JSON body.
const tokenFrom = (res) => tokenCookie(res)?.split(";")[0].slice("token=".length);

describe("login flow", () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser({ email: EMAIL, password: PASSWORD, phone: "9100000001" });
  });

  describe("valid credentials", () => {
    it("signs in, sets an httpOnly cookie, and the session reaches protected routes", async () => {
      const agent = request.agent(app);

      const res = await login(agent, { emailOrUsername: EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeUndefined();
      expect(tokenFrom(res)).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(EMAIL);
      expect(res.body.user.password).toBeUndefined();
      expect(tokenCookie(res)).toMatch(/HttpOnly/i);

      // The agent sends back the cookies it was given, as the browser does.
      const me = await agent.get("/api/auth/me");
      expect(me.status).toBe(200);
      expect(me.body.user.email).toBe(EMAIL);
      expect(me.body.user.password).toBeUndefined();

      // The cookie value alone authenticates; the same token in an Authorization header does not (H09).
      const viaCookie = await request(app).get("/api/auth/me").set("Cookie", `token=${tokenFrom(res)}`);
      expect(viaCookie.status).toBe(200);
      expect(String(viaCookie.body.user._id)).toBe(String(user._id));
      const viaHeader = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFrom(res)}`);
      expect(viaHeader.status).toBe(401);
    });

    it("accepts the email in any case and with surrounding spaces", async () => {
      const res = await login(request(app), { emailOrUsername: `  ${EMAIL.toUpperCase()} `, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(EMAIL);
    });

    it("records the login time", async () => {
      const before = Date.now();
      await login(request(app), { email: EMAIL, password: PASSWORD }).expect(200);
      const saved = await User.findById(user._id).lean();
      expect(new Date(saved.lastLogin).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it("signs out: the cookie is cleared and the session no longer authenticates", async () => {
      const agent = request.agent(app);
      await login(agent, { emailOrUsername: EMAIL, password: PASSWORD }).expect(200);

      const out = await agent.post("/api/auth/logout");
      expect(out.status).toBe(200);
      expect(tokenCookie(out)).toMatch(/token=;|Expires=Thu, 01 Jan 1970/);

      const me = await agent.get("/api/auth/me");
      expect(me.status).toBe(401);
    });
  });

  describe("invalid credentials", () => {
    it("rejects a wrong password without issuing a token or cookie", async () => {
      const agent = request.agent(app);
      const res = await login(agent, { emailOrUsername: EMAIL, password: "WrongPass@123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
      expect(tokenCookie(res)).toBeUndefined();
      expect((await agent.get("/api/auth/me")).status).toBe(401);
    });

    it("answers an unknown email exactly like a wrong password, so accounts can't be discovered", async () => {
      const [wrongPassword, unknownEmail] = await Promise.all([
        login(request(app), { emailOrUsername: EMAIL, password: "WrongPass@123" }),
        login(request(app), { emailOrUsername: "nobody-here@example.com", password: "WrongPass@123" }),
      ]);

      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.status).toBe(unknownEmail.status);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it("does not reveal that an account is suspended to someone without its password", async () => {
      await User.updateOne({ _id: user._id }, { $set: { isActive: false } });

      const wrongPassword = await login(request(app), { emailOrUsername: EMAIL, password: "WrongPass@123" });
      expect(wrongPassword.status).toBe(401);

      // The real owner is told why they can't sign in, and still gets no token.
      const rightPassword = await login(request(app), { emailOrUsername: EMAIL, password: PASSWORD });
      expect(rightPassword.status).toBe(403);
      expect(rightPassword.body.token).toBeUndefined();
      expect(tokenCookie(rightPassword)).toBeUndefined();
    });

    it("requires both an identifier and a password", async () => {
      expect((await login(request(app), { emailOrUsername: EMAIL })).status).toBe(400);
      expect((await login(request(app), { password: PASSWORD })).status).toBe(400);
    });

    it("rejects a forged or tampered token on protected routes", async () => {
      const res = await login(request(app), { emailOrUsername: EMAIL, password: PASSWORD }).expect(200);
      const tampered = `${tokenFrom(res).slice(0, -4)}abcd`;

      expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tampered}`)).status).toBe(401);
      expect((await request(app).get("/api/auth/me").set("Cookie", "token=not.a.jwt")).status).toBe(401);
    });
  });
});
