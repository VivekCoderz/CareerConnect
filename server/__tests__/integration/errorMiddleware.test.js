const request = require("supertest");
const Sentry = require("@sentry/node");
const app = require("../../app");
const NotificationReadCursor = require("../../models/NotificationReadCursor");
const { GENERIC_MESSAGE } = require("../../middleware/errorMiddleware");
const { createUserWithToken } = require("../helpers/createTestUser");

describe("forced server errors", () => {
  let capture;
  beforeEach(() => {
    capture = jest.spyOn(Sentry, "captureException").mockImplementation(() => "event-id");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("a thrown route error returns the generic message and is sent to Sentry", async () => {
    const admin = await createUserWithToken({ email: "err-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });

    const res = await request(app).post("/api/admin/debug/sentry-test").set("Authorization", `Bearer ${admin.token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: GENERIC_MESSAGE });
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("a controller failure is passed to the error handler instead of leaking details", async () => {
    const student = await createUserWithToken({ email: "err-student@example.com" });
    jest.spyOn(NotificationReadCursor, "findOne").mockImplementation(() => {
      throw new Error("MongoServerError: connection 7 to db-internal:27017 closed");
    });

    const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${student.token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: GENERIC_MESSAGE });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][0].message).toMatch(/db-internal/);
  });
});
