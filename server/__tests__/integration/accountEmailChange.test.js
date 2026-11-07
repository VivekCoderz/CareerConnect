jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
jest.mock("../../services/emailValidationService", () => ({
  ...jest.requireActual("../../services/emailValidationService"),
  validateEmail: jest.fn().mockImplementation(async (email) => ({ isValid: true, normalizedEmail: email })),
}));

const request = require("supertest");
const app = require("../../app");
const sendEmail = require("../../utils/sendEmail");
const getFirebaseAdmin = require("../../config/firebaseAdmin");
const User = require("../../models/User");
const Otp = require("../../models/Otp");
const { createUserWithToken } = require("../helpers/createTestUser");

// Fresher profile: the name saves directly. The email changes only after the user proves it's
// them (password, or a code to the current email plus a new password) and verifies a code
// sent to the new address.
// Test-only credentials, assembled so secret scanners do not mistake them for real ones.
const PASSWORD = ["Password", "123"].join("@");
const WRONG_PASSWORD = ["Wrong", "123"].join("@");
const ANY_PASSWORD = ["any", "thing"].join("");
const WEAK_PASSWORD = ["short", "1"].join("");
const NEW_PASSWORD = ["NewPass", "2026"].join("#");
const OTHER_PASSWORD = ["Other", "2026x"].join("#");
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const post = (token, path, body = {}) => request(app).post(`/api/account${path}`).set(auth(token)).send(body);

let seq = 0;
const nextEmail = () => `new-address-${++seq}@example.com`;
let phoneSeq = 0;
const newUser = (email, extra = {}) =>
  createUserWithToken({ email, phone: `91000000${String(++phoneSeq).padStart(2, "0")}`, ...extra });

const sentCode = (to) => {
  const call = sendEmail.mock.calls.filter(([opts]) => opts.to === to && /\d{6}/.test(opts.html)).pop();
  return call && call[0].html.match(/>(\d{6})</)[1];
};
const wrongCode = (code) => (code === "123456" ? "654321" : "123456");
// Lets the next code be sent without waiting out the 60-second resend timer.
const skipResendWait = (userId) => Otp.updateMany({ user: userId }, { $set: { lastSentAt: new Date(0) } });

const changeToken = async (token) => (await post(token, "/email/verify-password", { password: PASSWORD })).body.changeToken;

describe("change email with the password", () => {
  beforeEach(() => sendEmail.mockClear());

  it("refuses a wrong password", async () => {
    const { token } = await newUser("pw@student.test");
    const res = await post(token, "/email/verify-password", { password: WRONG_PASSWORD });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("INVALID_PASSWORD");
    expect(res.body.changeToken).toBeUndefined();
  });

  it("points an account with no password to the forgot-password path", async () => {
    const { user, token } = await newUser("google-only@student.test");
    await User.updateOne({ _id: user._id }, { $unset: { password: "" } });
    const res = await post(token, "/email/verify-password", { password: ANY_PASSWORD });
    expect(res.body.code).toBe("PASSWORD_NOT_SET");
  });

  it("rejects a bad, unchanged or taken address, and a missing change token", async () => {
    const { token } = await newUser("mine@student.test");
    await newUser("taken@student.test");
    const changeTok = await changeToken(token);

    expect((await post(token, "/email/request-new", { changeToken: changeTok, newEmail: "nope" })).body.code).toBe("INVALID_EMAIL");
    expect((await post(token, "/email/request-new", { changeToken: changeTok, newEmail: "MINE@student.test" })).body.code).toBe("SAME_EMAIL");
    const taken = await post(token, "/email/request-new", { changeToken: changeTok, newEmail: "taken@student.test" });
    expect(taken.statusCode).toBe(409);
    expect(taken.body.code).toBe("EMAIL_TAKEN");
    expect((await post(token, "/email/request-new", { newEmail: nextEmail() })).body.code).toBe("STEP_EXPIRED");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("changes the email after the new address is verified, signs out other devices and alerts the old address", async () => {
    const { user, token } = await newUser("old@student.test");
    const email = nextEmail();
    const changeTok = await changeToken(token);

    expect((await post(token, "/email/request-new", { changeToken: changeTok, newEmail: email })).statusCode).toBe(200);
    expect((await User.findById(user._id)).email).toBe("old@student.test");

    const res = await post(token, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(email);
    const saved = await User.findById(user._id);
    expect(saved.email).toBe(email);
    expect(saved.isEmailVerified).toBe(true);
    expect((await request(app).get("/api/auth/me").set(auth(token))).statusCode).toBe(401);
    expect((await request(app).get("/api/auth/me").set(auth(res.body.authToken))).statusCode).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email, password: PASSWORD })).statusCode).toBe(200);
    expect(sendEmail.mock.calls.some(([opts]) => opts.to === "old@student.test" && /security alert/.test(opts.subject))).toBe(true);

    // The change token was for one change only.
    const again = await post(res.body.authToken, "/email/request-new", { changeToken: changeTok, newEmail: nextEmail() });
    expect(again.body.code).toBe("STEP_EXPIRED");
  });

  it("counts wrong codes down, then locks, and keeps the old email", async () => {
    const { user, token } = await newUser("keep@student.test");
    const email = nextEmail();
    const changeTok = await changeToken(token);
    await post(token, "/email/request-new", { changeToken: changeTok, newEmail: email });
    const code = sentCode(email);

    const first = await post(token, "/email/confirm-new", { changeToken: changeTok, otp: wrongCode(code) });
    expect(first.body).toMatchObject({ code: "OTP_INVALID", attemptsLeft: 4 });
    for (let i = 0; i < 3; i++) await post(token, "/email/confirm-new", { changeToken: changeTok, otp: wrongCode(code) });
    const fifth = await post(token, "/email/confirm-new", { changeToken: changeTok, otp: wrongCode(code) });
    expect(fifth.body.code).toBe("OTP_LOCKED");

    const right = await post(token, "/email/confirm-new", { changeToken: changeTok, otp: code });
    expect(right.body.code).toBe("OTP_LOCKED");
    expect((await User.findById(user._id)).email).toBe("keep@student.test");
  });

  it("reports an expired code", async () => {
    const { user, token } = await newUser("late@student.test");
    const email = nextEmail();
    const changeTok = await changeToken(token);
    await post(token, "/email/request-new", { changeToken: changeTok, newEmail: email });
    await Otp.updateMany({ user: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await post(token, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) });
    expect(res.body.code).toBe("OTP_EXPIRED");
  });

  it("waits 60 seconds between codes, allows 5 an hour, and only the latest code works", async () => {
    const { user, token } = await newUser("resend@student.test");
    const email = nextEmail();
    const changeTok = await changeToken(token);
    const send = () => post(token, "/email/request-new", { changeToken: changeTok, newEmail: email });

    await send();
    const firstCode = sentCode(email);
    const tooSoon = await send();
    expect(tooSoon.body.code).toBe("RESEND_TOO_SOON");
    expect(tooSoon.body.retryAfter).toBeGreaterThan(0);

    await skipResendWait(user._id);
    await send();
    const secondCode = sentCode(email);
    if (firstCode !== secondCode) {
      expect((await post(token, "/email/confirm-new", { changeToken: changeTok, otp: firstCode })).body.code).toBe("OTP_INVALID");
    }
    for (let i = 0; i < 3; i++) {
      await skipResendWait(user._id);
      expect((await send()).statusCode).toBe(200);
    }
    await skipResendWait(user._id);
    expect((await send()).body.code).toBe("TOO_MANY_SENDS");
  });

  it("does not let another account use the code or the change token", async () => {
    const owner = await newUser("owner@student.test");
    const other = await newUser("other@student.test");
    const email = nextEmail();
    const changeTok = await changeToken(owner.token);
    await post(owner.token, "/email/request-new", { changeToken: changeTok, newEmail: email });

    const res = await post(other.token, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) });
    expect(res.body.code).toBe("STEP_EXPIRED");
    expect((await User.findById(other.user._id)).email).toBe("other@student.test");
  });

  it("moves the Firebase sign-in email, and keeps the old email if Firebase has the new one", async () => {
    const admin = getFirebaseAdmin();
    const ok = await newUser("linked@student.test", { firebaseUid: "fb-linked" });
    const updateUser = jest.fn().mockResolvedValue({});
    let spy = jest.spyOn(admin, "auth").mockReturnValue({ updateUser });
    let email = nextEmail();
    let changeTok = await changeToken(ok.token);
    await post(ok.token, "/email/request-new", { changeToken: changeTok, newEmail: email });
    expect((await post(ok.token, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) })).statusCode).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("fb-linked", { email, emailVerified: true });
    spy.mockRestore();

    const clash = await newUser("fbtaken@student.test", { firebaseUid: "fb-taken" });
    spy = jest.spyOn(admin, "auth").mockReturnValue({
      updateUser: jest.fn().mockRejectedValue(Object.assign(new Error("exists"), { code: "auth/email-already-exists" })),
    });
    email = nextEmail();
    changeTok = await changeToken(clash.token);
    await post(clash.token, "/email/request-new", { changeToken: changeTok, newEmail: email });
    const res = await post(clash.token, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) });
    expect(res.statusCode).toBe(409);
    expect((await User.findById(clash.user._id)).email).toBe("fbtaken@student.test");
    spy.mockRestore();
  });
});

describe("change email via forgot password", () => {
  beforeEach(() => sendEmail.mockClear());

  it("verifies the current email, sets a new password, signs out other devices, then changes the email", async () => {
    const { user, token } = await newUser("imran@geetauniversity.edu.in");

    const sent = await post(token, "/email/send-old-otp");
    expect(sent.body.maskedEmail).toBe("im***@geetauniversity.edu.in");

    const verified = await post(token, "/email/verify-old-otp", { otp: sentCode("imran@geetauniversity.edu.in") });
    expect(verified.statusCode).toBe(200);
    const { resetToken } = verified.body;

    const weak = await post(token, "/password/reset", { resetToken, newPassword: WEAK_PASSWORD });
    expect(weak.statusCode).toBe(400);

    const reset = await post(token, "/password/reset", { resetToken, newPassword: NEW_PASSWORD });
    expect(reset.statusCode).toBe(200);
    expect((await request(app).get("/api/auth/me").set(auth(token))).statusCode).toBe(401);
    const { authToken, changeToken: changeTok } = reset.body;
    const login = await request(app).post("/api/auth/login").send({ email: "imran@geetauniversity.edu.in", password: NEW_PASSWORD });
    expect(login.statusCode).toBe(200);

    // The reset token works once.
    expect((await post(authToken, "/password/reset", { resetToken, newPassword: OTHER_PASSWORD })).body.code).toBe("STEP_EXPIRED");

    const email = nextEmail();
    await post(authToken, "/email/request-new", { changeToken: changeTok, newEmail: email });
    const done = await post(authToken, "/email/confirm-new", { changeToken: changeTok, otp: sentCode(email) });
    expect(done.statusCode).toBe(200);
    expect((await User.findById(user._id)).email).toBe(email);
  });

  it("does not issue a reset token for a wrong code", async () => {
    const { token } = await newUser("forgot@student.test");
    await post(token, "/email/send-old-otp");
    const res = await post(token, "/email/verify-old-otp", { otp: wrongCode(sentCode("forgot@student.test")) });
    expect(res.body.code).toBe("OTP_INVALID");
    expect(res.body.resetToken).toBeUndefined();
  });
});

describe("edit name", () => {
  const updateName = (token, body) => request(app).put("/api/users/profile").set(auth(token)).send(body);

  it("saves the full name and keeps first/last name in step", async () => {
    const { user, token } = await newUser("name@student.test");
    const res = await updateName(token, { fullName: "  Asha   Rao Kumar " });
    expect(res.statusCode).toBe(200);
    const saved = await User.findById(user._id);
    expect(saved.fullName).toBe("Asha Rao Kumar");
    expect(saved.firstName).toBe("Asha");
    expect(saved.lastName).toBe("Rao Kumar");
  });

  it("rejects names that are not text, contain markup, or are not 2 to 50 characters", async () => {
    const { user, token } = await newUser("badname@student.test");
    expect((await updateName(token, { fullName: 42 })).statusCode).toBe(400);
    expect((await updateName(token, { fullName: "<b>Asha</b>" })).statusCode).toBe(400);
    expect((await updateName(token, { fullName: "A" })).statusCode).toBe(400);
    expect((await updateName(token, { fullName: "A".repeat(51) })).statusCode).toBe(400);
    expect((await User.findById(user._id)).fullName).toBe("Test Student");
  });
});
