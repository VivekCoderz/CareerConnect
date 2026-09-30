const crypto = require("crypto");
const axios = require("axios");
const request = require("supertest");
const app = require("../../app");
const Course = require("../../models/Course");
const CourseOrder = require("../../models/CourseOrder");
const CourseApplication = require("../../models/CourseApplication");
const Notification = require("../../models/Notification");
const { createEmployerWithToken, createUserWithToken } = require("../helpers/createTestUser");

const TEST_KEY_ID = "rzp_unit_key_id";
const TEST_KEY_SECRET = "unit-test-razorpay-secret";

const sign = (orderId, paymentId, secret = TEST_KEY_SECRET) =>
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

const as = (token, path) => request(app).post(path).set("Authorization", `Bearer ${token}`);

const setup = async () => {
  const owner = await createEmployerWithToken({ email: `pay-owner-${Date.now()}@example.com` });
  const student = await createUserWithToken({ email: `pay-student-${Date.now()}@example.com` });
  const other = await createUserWithToken({ email: `pay-other-${Date.now()}@example.com` });
  const course = await Course.create({
    title: "Paid Career Track", description: "A paid course for candidates",
    domain: "Technology", category: "Engineering", duration: 2, price: 499,
    status: "Published", createdBy: owner.user._id,
  });
  return { student, other, course };
};

const createPendingOrder = (user, course, razorpayOrderId) =>
  CourseOrder.create({
    user: user._id, course: course._id, amount: course.price,
    status: "created", receipt: "rcpt_test", razorpayOrderId,
  });

const verify = (token, body) => as(token, "/api/payment/verify").send(body);

describe("payment verification", () => {
  const originalEnv = { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET };
  let axiosPost;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
    axiosPost = jest.spyOn(axios, "post");
  });

  afterEach(() => {
    axiosPost.mockRestore();
    const restore = (key, value) => (value === undefined ? delete process.env[key] : (process.env[key] = value));
    restore("RAZORPAY_KEY_ID", originalEnv.id);
    restore("RAZORPAY_KEY_SECRET", originalEnv.secret);
  });

  it("rejects simulated order_test_ order IDs", async () => {
    const { student, course } = await setup();
    const response = await verify(student.token, {
      razorpayOrderId: "order_test_abc123", razorpayPaymentId: "pay_fake", courseId: course._id,
    });
    expect(response.status).toBe(400);

    const signed = await verify(student.token, {
      razorpayOrderId: "order_test_abc123", razorpayPaymentId: "pay_fake",
      razorpaySignature: "deadbeef", courseId: course._id,
    });
    expect(signed.status).toBe(400);
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(0);
  });

  it("rejects a missing signature", async () => {
    const { student, course } = await setup();
    await createPendingOrder(student.user, course, "order_real_1");
    const response = await verify(student.token, {
      razorpayOrderId: "order_real_1", razorpayPaymentId: "pay_1", courseId: course._id,
    });
    expect(response.status).toBe(400);
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(0);
  });

  it("rejects a wrong signature", async () => {
    const { student, course } = await setup();
    await createPendingOrder(student.user, course, "order_real_2");
    const response = await verify(student.token, {
      razorpayOrderId: "order_real_2", razorpayPaymentId: "pay_2",
      razorpaySignature: sign("order_real_2", "pay_2", "wrong-secret"), courseId: course._id,
    });
    expect(response.status).toBe(400);
    expect((await CourseOrder.findOne({ razorpayOrderId: "order_real_2" })).status).toBe("created");
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(0);
  });

  it("rejects a valid signature for an order that belongs to another user", async () => {
    const { student, other, course } = await setup();
    await createPendingOrder(other.user, course, "order_real_3");
    const response = await verify(student.token, {
      razorpayOrderId: "order_real_3", razorpayPaymentId: "pay_3",
      razorpaySignature: sign("order_real_3", "pay_3"), courseId: course._id,
    });
    expect(response.status).toBe(400);
    expect((await CourseOrder.findOne({ razorpayOrderId: "order_real_3" })).status).toBe("created");
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(0);
  });

  it("rejects a valid signature with no existing order and creates none", async () => {
    const { student, course } = await setup();
    const response = await verify(student.token, {
      razorpayOrderId: "order_unknown", razorpayPaymentId: "pay_4",
      razorpaySignature: sign("order_unknown", "pay_4"), courseId: course._id,
    });
    expect(response.status).toBe(400);
    expect(await CourseOrder.countDocuments({})).toBe(0);
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(0);
  });

  it("enrolls the user for a valid signature on their own created order", async () => {
    const { student, course } = await setup();
    axiosPost.mockResolvedValue({ data: { id: "order_rzp_5" } });

    const order = await as(student.token, "/api/payment/create-order").send({ courseId: course._id });
    expect(order.status).toBe(200);
    expect(order.body).toMatchObject({ orderId: "order_rzp_5", keyId: TEST_KEY_ID });
    expect(order.body.isSimulated).toBeUndefined();

    const body = {
      razorpayOrderId: "order_rzp_5", razorpayPaymentId: "pay_5",
      razorpaySignature: sign("order_rzp_5", "pay_5"), courseId: course._id,
    };
    const response = await verify(student.token, body);
    expect(response.status).toBe(200);
    expect((await CourseOrder.findOne({ razorpayOrderId: "order_rzp_5" })).status).toBe("completed");
    const application = await CourseApplication.findOne({ student: student.user._id, course: course._id });
    expect(application.status).toBe("Enrolled");

    const repeat = await verify(student.token, body);
    expect(repeat.status).toBe(200);
    expect(await CourseApplication.countDocuments({ student: student.user._id })).toBe(1);
    expect(await Notification.countDocuments({ recipient: student.user._id, category: "payment" })).toBe(1);
  });

  it("returns 502 and saves no order when Razorpay order creation fails", async () => {
    const { student, course } = await setup();
    axiosPost.mockRejectedValue(new Error("network down"));
    const response = await as(student.token, "/api/payment/create-order").send({ courseId: course._id });
    expect(response.status).toBe(502);
    expect(await CourseOrder.countDocuments({})).toBe(0);
  });

  it("returns 503 when Razorpay credentials are not configured", async () => {
    const { student, course } = await setup();
    delete process.env.RAZORPAY_KEY_SECRET;
    const created = await as(student.token, "/api/payment/create-order").send({ courseId: course._id });
    expect(created.status).toBe(503);
    const verified = await verify(student.token, {
      razorpayOrderId: "order_x", razorpayPaymentId: "pay_x", razorpaySignature: "sig", courseId: course._id,
    });
    expect(verified.status).toBe(503);
    expect(axiosPost).not.toHaveBeenCalled();
  });
});
