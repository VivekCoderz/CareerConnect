const http = require("http");
const request = require("supertest");
const { io: connectClient } = require("socket.io-client");
const app = require("../../app");
const socketService = require("../../services/socketService");
const { createNotification } = require("../../services/notificationService");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { createTestUser } = require("../helpers/createTestUser");

// H17: a socket is authenticated only at its handshake, so revoking a user's tokens
// must also close the sockets they already have open.
const ALLOWED_ORIGIN = "http://localhost:5173";
const EMAIL = "h17-socket@example.com";
const PASSWORD = "Password@123";

describe("open sockets after logout and password reset (H17)", () => {
  let httpServer;
  let url;
  let user;
  const openSockets = [];

  beforeAll(async () => {
    httpServer = http.createServer();
    socketService.init(httpServer);
    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
  });

  beforeEach(async () => {
    user = await createTestUser({ email: EMAIL, password: PASSWORD, phone: "9100000017" });
  });

  afterEach(() => {
    while (openSockets.length) openSockets.pop().disconnect();
  });

  afterAll(async () => {
    await new Promise((resolve) => socketService.getIO().close(() => resolve()));
  });

  const tokenOf = (res) =>
    [].concat(res.headers["set-cookie"] || []).find((c) => c.startsWith("token=")).split(";")[0].slice("token=".length);
  const login = async () =>
    tokenOf(await request(app).post("/api/auth/login").send({ emailOrUsername: EMAIL, password: PASSWORD }).expect(200));

  const connect = (token) =>
    new Promise((resolve, reject) => {
      const socket = connectClient(url, {
        transports: ["websocket"],
        extraHeaders: { Origin: ALLOWED_ORIGIN, Cookie: `token=${token}` },
        forceNew: true,
        reconnection: false,
      });
      openSockets.push(socket);
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", reject);
    });

  const disconnected = (socket) => new Promise((resolve) => socket.once("disconnect", resolve));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
  const notify = () => createNotification({ recipientId: user._id, title: "After logout", message: "Should not arrive" });

  it("receives notifications while signed in", async () => {
    const socket = await connect(await login());
    const received = new Promise((resolve) => socket.once("notification", resolve));

    await notify();

    expect((await received).title).toBe("After logout");
  });

  it("closes an open socket on logout from another tab, so it gets no more notifications", async () => {
    const token = await login();
    const otherTab = await connect(token);
    const received = [];
    otherTab.on("notification", (n) => received.push(n));
    const closed = disconnected(otherTab);

    await request(app).post("/api/auth/logout").set("Cookie", `token=${token}`).expect(200);

    await closed;
    await notify();
    await settle();
    expect(received).toHaveLength(0);
    expect(otherTab.connected).toBe(false);
  });

  it("closes open sockets after a password reset", async () => {
    const socket = await connect(await login());
    const closed = disconnected(socket);

    const { code } = await issueOtp(EMAIL, "reset-password");
    const verificationToken = await verifyOtp(EMAIL, "reset-password", code);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ email: EMAIL, verificationToken, password: "NewPassword@456", confirmPassword: "NewPassword@456" })
      .expect(200);

    await closed;
    expect(socket.connected).toBe(false);
  });

  it("refuses to reconnect with the revoked token", async () => {
    const token = await login();
    await request(app).post("/api/auth/logout").set("Cookie", `token=${token}`).expect(200);

    await expect(connect(token)).rejects.toThrow("NOT_AUTHENTICATED");
  });
});
