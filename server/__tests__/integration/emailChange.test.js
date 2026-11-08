// Bug 5: a candidate changes their email after confirming a code sent to the new address.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test" }));
jest.mock("../../services/emailValidationService", () => ({
  ...jest.requireActual("../../services/emailValidationService"),
  validateEmail: jest.fn().mockImplementation(async (email) => ({ isValid: true, normalizedEmail: email })),
}));

const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const { loginLimiter } = require("../../middleware/rateLimitMiddleware");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const PASSWORD = "Password@123";

// The code from the last email sent to this address.
const codeSentTo = (email) => {
  const call = [...sendEmail.mock.calls].reverse().find(([msg]) => msg.to === email);
  return call && call[0].html.match(/>(\d{6})</)[1];
};
const requestChange = (identity, body) =>
  request(app).post("/api/auth/email-change/request").set(auth(identity)).send(body);
const confirmChange = (identity, body) =>
  request(app).post("/api/auth/email-change/confirm").set(auth(identity)).send(body);

describe("email change", () => {
  let fresher;

  beforeEach(async () => {
    sendEmail.mockClear();
    // All requests come from one test IP; the per-IP password-guess limit is 10 a minute.
    for (const ip of ["::ffff:127.0.0.1", "127.0.0.1", "::1"]) loginLimiter.resetKey(ip);
    fresher = await createUserWithToken({ email: "old@example.com", userType: "fresher", phone: "9123400051" });
  });

  it("changes the email only after the code sent to the new address is entered", async () => {
    const asked = await requestChange(fresher, { email: " New@Example.com ", password: PASSWORD });
    expect(asked.status).toBe(200);
    expect(asked.body.email).toBe("new@example.com");
    expect((await User.findById(fresher.user._id)).email).toBe("old@example.com");

    const wrong = await confirmChange(fresher, { email: "new@example.com", otp: "000000" });
    expect(wrong.status).toBe(400);

    const done = await confirmChange(fresher, { email: "new@example.com", otp: codeSentTo("new@example.com") });
    expect(done.status).toBe(200);
    expect(await User.findById(fresher.user._id)).toMatchObject({ email: "new@example.com", isEmailVerified: true });

    const me = await request(app).get("/api/auth/me").set(auth(fresher));
    expect(me.body.user.email).toBe("new@example.com");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "old@example.com" }));

    const login = await request(app).post("/api/auth/login").send({ emailOrUsername: "new@example.com", password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it("does not accept the same code twice", async () => {
    await requestChange(fresher, { email: "new@example.com", password: PASSWORD });
    const otp = codeSentTo("new@example.com");
    expect((await confirmChange(fresher, { email: "new@example.com", otp })).status).toBe(200);
    expect((await confirmChange(fresher, { email: "new@example.com", otp })).status).toBe(400);
  });

  it("asks for the current password", async () => {
    // 403, not 401: the client signs the user out on any 401.
    expect((await requestChange(fresher, { email: "new@example.com" })).status).toBe(403);
    expect((await requestChange(fresher, { email: "new@example.com", password: "Wrong@123" })).status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("lets an account without a password (Google sign-in) ask without one", async () => {
    const googleUser = await createUserWithToken({
      email: "google@example.com", userType: "fresher", phone: "9123400052", authProviders: ["google"],
    });
    await User.updateOne({ _id: googleUser.user._id }, { $unset: { password: 1 }, $set: { hasPassword: false } });

    expect((await requestChange(googleUser, { email: "google-new@example.com" })).status).toBe(200);
  });

  it("refuses an email that another account uses, or the current one", async () => {
    await createUserWithToken({ email: "taken@example.com", phone: "9123400053" });

    expect((await requestChange(fresher, { email: "taken@example.com", password: PASSWORD })).status).toBe(409);
    expect((await requestChange(fresher, { email: "old@example.com", password: PASSWORD })).status).toBe(400);
  });

  it("refuses the change if the address was registered after the code was sent", async () => {
    await requestChange(fresher, { email: "new@example.com", password: PASSWORD });
    await createUserWithToken({ email: "new@example.com", phone: "9123400054" });

    const res = await confirmChange(fresher, { email: "new@example.com", otp: codeSentTo("new@example.com") });
    expect(res.status).toBe(409);
    expect((await User.findById(fresher.user._id)).email).toBe("old@example.com");
  });

  it("does not let another account use the code", async () => {
    const other = await createUserWithToken({ email: "other@example.com", phone: "9123400055" });
    await requestChange(fresher, { email: "new@example.com", password: PASSWORD });

    const res = await confirmChange(other, { email: "new@example.com", otp: codeSentTo("new@example.com") });
    expect(res.status).toBe(400);
    expect((await User.findById(other.user._id)).email).toBe("other@example.com");
  });

  it("is not available to employer accounts", async () => {
    const employer = await createEmployerWithToken({ email: "hr@example.com", phone: "9123400056" });
    expect((await requestChange(employer, { email: "hr-new@example.com", password: PASSWORD })).status).toBe(403);
  });

  it("needs a signed-in user", async () => {
    const res = await request(app).post("/api/auth/email-change/request").send({ email: "new@example.com" });
    expect(res.status).toBe(401);
  });
});
