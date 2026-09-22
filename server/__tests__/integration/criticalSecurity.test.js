const request = require("supertest");
const app = require("../../app");
const { createUserWithToken } = require("../helpers/createTestUser");
const Notification = require("../../models/Notification");
const PendingOTP = require("../../models/PendingOTP");
const User = require("../../models/User");
const { issueOtp, verifyOtp, consumeVerifiedOtp } = require("../../services/otpService");
const getFirebaseAdmin = require("../../config/firebaseAdmin.js");
const EventEmitter = require("events");
const { registerSseClient, broadcastRealtimeNotification } = require("../../services/notificationService");

describe("critical security boundaries", () => {
  beforeEach(() => {
    getFirebaseAdmin.verifyIdToken.mockReset();
    getFirebaseAdmin.getUser.mockReset().mockResolvedValue({ uid: "existing-firebase-user" });
  });

  it("only links a verified Google identity and preserves an existing UID", async () => {
    const { user } = await createUserWithToken({ email: "link-test@example.com" });
    const claims = {
      uid: "google-uid-one",
      email: user.email,
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
    };
    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce({ ...claims, email_verified: false });
    expect((await request(app).post("/api/auth/google-auth").send({ idToken: "token" })).statusCode).toBe(403);
    expect((await User.findById(user._id)).firebaseUid).toBeFalsy();

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce({ ...claims, firebase: { sign_in_provider: "password" } });
    expect((await request(app).post("/api/auth/google-auth").send({ idToken: "token" })).statusCode).toBe(403);

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce(claims);
    expect((await request(app).post("/api/auth/google-auth").send({ idToken: "token" })).statusCode).toBe(200);
    expect((await User.findById(user._id)).firebaseUid).toBe(claims.uid);

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce({ ...claims, uid: "different-uid" });
    const conflict = await request(app).post("/api/auth/google-auth").send({ idToken: "token" });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.body.code).toBe("ACCOUNT_IDENTITY_CONFLICT");
    expect((await User.findById(user._id)).firebaseUid).toBe(claims.uid);
  });

  it("completes password setup using a verified Google token without client-side provider linking", async () => {
    const account = await createUserWithToken({ email: "google-password-setup@example.com",
      firebaseUid: "google-setup-uid", hasPassword: false,
      authProviders: ["google"] });
    await User.updateOne({ _id: account.user._id }, { $unset: { password: "" } });
    const claims = { uid: "google-setup-uid", email: account.user.email,
      email_verified: true, firebase: { sign_in_provider: "google.com" } };
    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce(claims);
    const response = await request(app).post("/api/auth/complete-password-setup")
      .set("Cookie", `token=${account.token}`)
      .send({ idToken: "fresh-google-token", password: "StrongPass@123" });
    expect(response.statusCode).toBe(200);
    expect(response.body.user.hasPassword).toBe(true);
    const saved = await User.findById(account.user._id).select("+password");
    expect(saved.hasPassword).toBe(true);
    expect(saved.password).not.toBe("StrongPass@123");
    expect(saved.authProviders).toEqual(expect.arrayContaining(["google", "email"]));

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce({ ...claims,
      firebase: { sign_in_provider: "password" } });
    const second = await request(app).post("/api/auth/complete-password-setup")
      .set("Cookie", `token=${account.token}`)
      .send({ idToken: "password-token", password: "AnotherPass@123" });
    expect(second.statusCode).toBe(403);
  });

  it("recovers an unfinished Google signup only when its previous Firebase UID is gone", async () => {
    const account = await createUserWithToken({ email: "orphaned-google@example.com",
      firebaseUid: "deleted-firebase-uid", authProviders: ["google"],
      hasPassword: false, phone: "", isProfileComplete: false });
    await User.updateOne({ _id: account.user._id }, { $unset: { password: "" } });
    const claims = { uid: "new-firebase-uid", email: account.user.email,
      email_verified: true, firebase: { sign_in_provider: "google.com" } };

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce(claims);
    const stillExists = await request(app).post("/api/auth/google-auth").send({ idToken: "google-token" });
    expect(stillExists.statusCode).toBe(409);
    expect(stillExists.body.code).toBe("PREVIOUS_IDENTITY_ACTIVE");
    expect((await User.findById(account.user._id)).firebaseUid).toBe("deleted-firebase-uid");

    getFirebaseAdmin.verifyIdToken.mockResolvedValueOnce(claims);
    getFirebaseAdmin.getUser.mockRejectedValueOnce(Object.assign(new Error("not found"), { code: "auth/user-not-found" }));
    const recovered = await request(app).post("/api/auth/google-auth").send({ idToken: "google-token" });
    expect(recovered.statusCode).toBe(200);
    expect(recovered.body.requiresPasswordSetup).toBe(true);
    expect((await User.findById(account.user._id)).firebaseUid).toBe("new-firebase-uid");
  });

  it("cancels only an unfinished Google signup and reports whether it was deleted", async () => {
    const unfinished = await createUserWithToken({ email: "cancel-unfinished@example.com",
      firebaseUid: "cancel-uid", authProviders: ["google"],
      hasPassword: false, phone: "", isProfileComplete: false });
    await User.updateOne({ _id: unfinished.user._id }, { $unset: { password: "" } });
    const cancelled = await request(app).post("/api/auth/cancel-google-signup")
      .set("Cookie", `token=${unfinished.token}`);
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.body.deleted).toBe(true);
    expect(await User.findById(unfinished.user._id)).toBeNull();

    const established = await createUserWithToken({ email: "cancel-established@example.com",
      firebaseUid: "established-uid", authProviders: ["google", "email"], hasPassword: true });
    const kept = await request(app).post("/api/auth/cancel-google-signup")
      .set("Cookie", `token=${established.token}`);
    expect(kept.statusCode).toBe(200);
    expect(kept.body.deleted).toBe(false);
    expect(await User.findById(established.user._id)).toBeTruthy();
  });

  it("stores only an OTP hash and accepts its proof once", async () => {
    const email = "otp-test@example.com";
    const { code } = await issueOtp(email, "verification");
    const stored = await PendingOTP.collection.findOne({ email });
    expect(stored.otp).toBeUndefined();
    expect(stored.otpHash).toBeTruthy();
    expect(stored.otpHash).not.toBe(code);

    expect(await verifyOtp(email, "verification", "000000" === code ? "111111" : "000000")).toBeNull();
    const proof = await verifyOtp(email, "verification", code);
    expect(proof).toMatch(/^[a-f0-9]{64}$/);
    expect(await consumeVerifiedOtp(email, "verification", proof)).toBe(true);
    expect(await consumeVerifiedOtp(email, "verification", proof)).toBe(false);
  });

  it("rejects expired and repeatedly guessed OTPs", async () => {
    const email = "expired-test@example.com";
    const { code } = await issueOtp(email, "reset-password");
    await PendingOTP.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await verifyOtp(email, "reset-password", code)).toBeNull();
    const { code: freshCode } = await issueOtp(email, "reset-password");
    for (let i = 0; i < 5; i += 1) {
      expect(await verifyOtp(email, "reset-password", "000000")).toBeNull();
    }
    expect(await verifyOtp(email, "reset-password", freshCode)).toBeNull();
  });

  it("revokes existing tokens after a one-use password reset", async () => {
    const { user, token } = await createUserWithToken({ email: "reset-test@example.com" });
    const { code } = await issueOtp(user.email, "reset-password");
    const proof = await verifyOtp(user.email, "reset-password", code);
    const body = { email: user.email, verificationToken: proof,
      password: "NewPassword@123", confirmPassword: "NewPassword@123" };
    expect((await request(app).post("/api/auth/reset-password").send(body)).statusCode).toBe(200);
    expect((await request(app).post("/api/auth/reset-password").send(body)).statusCode).toBe(403);
    expect((await request(app).get("/api/auth/me").set("Cookie", `token=${token}`)).statusCode).toBe(401);
  });

  it("isolates private notifications and broadcast read state", async () => {
    const alice = await createUserWithToken({ email: "alice-notification@example.com" });
    const bob = await createUserWithToken({ email: "bob-notification@example.com" });
    const privateMail = await Notification.create({
      recipient: alice.user._id, title: "Private", preview: "Private", content: "Sensitive",
    });
    const announcement = await Notification.create({
      recipient: null, title: "Public", preview: "Public", content: "Announcement",
    });
    const aliceRequest = (method, path) => request(app)[method](path).set("Cookie", `token=${alice.token}`);
    const bobRequest = (method, path) => request(app)[method](path).set("Cookie", `token=${bob.token}`);

    expect((await request(app).get("/api/notifications/stream")).statusCode).toBe(401);
    expect((await bobRequest("get", `/api/notifications/${privateMail._id}`)).statusCode).toBe(404);
    expect((await bobRequest("put", `/api/notifications/${privateMail._id}/read`)).statusCode).toBe(404);
    expect((await bobRequest("delete", `/api/notifications/${privateMail._id}`)).statusCode).toBe(404);

    expect((await aliceRequest("put", `/api/notifications/${announcement._id}/read`)).statusCode).toBe(200);
    const bobList = await bobRequest("get", "/api/notifications");
    expect(bobList.statusCode).toBe(200);
    expect(bobList.body.notifications.find((n) => n._id === String(announcement._id)).isRead).toBe(false);
    expect(bobList.body.notifications.some((n) => n._id === String(privateMail._id))).toBe(false);

    expect((await aliceRequest("put", "/api/notifications/read-all")).statusCode).toBe(200);
    const afterAliceReadAll = await bobRequest("get", "/api/notifications");
    expect(afterAliceReadAll.body.notifications.find((n) => n._id === String(announcement._id)).isRead).toBe(false);

    expect((await aliceRequest("delete", `/api/notifications/${announcement._id}`)).statusCode).toBe(200);
    const aliceList = await aliceRequest("get", "/api/notifications");
    expect(aliceList.body.notifications.some((n) => n._id === String(announcement._id))).toBe(false);
    expect((await bobRequest("get", `/api/notifications/${announcement._id}`)).statusCode).toBe(200);
  });

  it("sends private SSE events only to the recipient", () => {
    const connection = () => {
      const stream = new EventEmitter();
      stream.events = [];
      stream.writableLength = 0;
      stream.write = (value) => stream.events.push(value);
      stream.end = jest.fn();
      return stream;
    };
    const alice = connection();
    const bob = connection();
    registerSseClient("alice", alice);
    registerSseClient("bob", bob);
    broadcastRealtimeNotification({ _id: "private-1", recipient: "alice", title: "Secret" });
    expect(alice.events.some((event) => event.includes('"title":"Secret"'))).toBe(true);
    expect(bob.events.some((event) => event.includes('"title":"Secret"'))).toBe(false);
    alice.emit("close");
    bob.emit("close");
  });
});
