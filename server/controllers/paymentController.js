const Course = require("../models/Course");
const CourseOrder = require("../models/CourseOrder");
const CourseApplication = require("../models/CourseApplication");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const {
  getRazorpayConfig,
  paymentsNotConfigured,
  isValidRazorpaySignature,
  verifyWebhookSignature,
  callRazorpayCreateOrder,
} = require("../utils/razorpayUtils");

// ==========================================
// 1. CREATE ORDER / FREE ENROLLMENT
// POST /api/payment/create-order
// ==========================================
exports.createOrder = async (req, res) => {
  try {
    const user = req.user;
    const { courseId } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "Published") {
      return res.status(404).json({ success: false, message: "Course not found or is not published" });
    }

    // Check if user is already enrolled
    const existingEnrollment = await CourseApplication.findOne({
      student: user._id,
      course: course._id,
      status: { $in: ["Enrolled", "Completed"] },
    });

    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: "You are already enrolled in this course" });
    }

    // FREE COURSE CASE
    const coursePrice = Number(course.price) || 0;
    if (coursePrice <= 0) {
      let application = await CourseApplication.findOne({ student: user._id, course: course._id });
      if (application) {
        application.status = "Enrolled";
        await application.save();
      } else {
        application = await CourseApplication.create({
          student: user._id,
          course: course._id,
          status: "Enrolled",
          progress: 0,
        });
      }

      await Enrollment.findOneAndUpdate(
        { userId: user._id, courseId: course._id },
        {
          userId: user._id,
          courseId: course._id,
          enrolledRole: user.userType || "student",
          status: "Enrolled",
          progressPercentage: 0,
          lastAccessedAt: new Date(),
        },
        { upsert: true, new: true }
      ).catch(() => {});

      const freeOrderReceipt = `free_${Date.now().toString().slice(-8)}`;
      await CourseOrder.create({
        user: user._id,
        course: course._id,
        amount: 0,
        currency: "INR",
        status: "completed",
        isFree: true,
        receipt: freeOrderReceipt,
        razorpayOrderId: `order_free_${Date.now()}`,
        razorpayPaymentId: `pay_free_${Date.now()}`,
        paidAt: new Date(),
      }).catch(() => {});

      try {
        await Notification.create({
          recipient: user._id,
          recipientId: user._id,
          sender: "E2Job LMS",
          senderRole: "system",
          title: "Free Course Enrolled! 🎓",
          preview: `You have unlocked full access to ${course.title}.`,
          message: `Congratulations! You have successfully enrolled in ${course.title}. Start learning right now!`,
          category: "course_enrollment",
          link: "/student/courses",
        });
      } catch (notifErr) {
        console.warn("Non-blocking notification warning:", notifErr.message);
      }

      return res.status(200).json({
        success: true,
        isFree: true,
        message: "Enrolled in free course successfully!",
        courseId: course._id,
      });
    }

    // PAID COURSE CASE
    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig) {
      return paymentsNotConfigured(res);
    }

    const amountInPaise = Math.round(coursePrice * 100);
    const receiptId = `rcpt_${Date.now().toString().slice(-8)}`;

    const rzpResult = await callRazorpayCreateOrder(
      razorpayConfig,
      amountInPaise,
      "INR",
      receiptId,
      {
        courseId: course._id.toString(),
        userId: user._id.toString(),
        courseTitle: course.title.slice(0, 30),
      }
    );

    if (!rzpResult.success || !rzpResult.data?.id) {
      return res.status(502).json({
        success: false,
        message: "Could not create payment order with Razorpay. Please try again.",
      });
    }
    const razorpayOrderId = rzpResult.data.id;

    await CourseOrder.create({
      user: user._id,
      course: course._id,
      amount: coursePrice,
      currency: "INR",
      status: "created",
      isFree: false,
      receipt: receiptId,
      razorpayOrderId,
      metadata: { amountInPaise },
    });

    return res.status(200).json({
      success: true,
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: razorpayConfig.keyId,
      courseTitle: course.title,
      prefill: {
        name: user.fullName || "",
        email: user.email || "",
        contact: user.phone || "",
      },
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order. Please try again.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. VERIFY PAYMENT & UNLOCK COURSE
// POST /api/payment/verify
// ==========================================
exports.verifyPayment = async (req, res) => {
  try {
    const user = req.user;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const razorpayConfig = getRazorpayConfig();
    if (!razorpayConfig) {
      return paymentsNotConfigured(res);
    }

    const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
    if (
      !isNonEmptyString(razorpayOrderId) ||
      !isNonEmptyString(razorpayPaymentId) ||
      !isNonEmptyString(razorpaySignature) ||
      !courseId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const { keySecret } = razorpayConfig;
    if (!isValidRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)) {
      console.warn("Payment signature verification failed for order:", razorpayOrderId);
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Please contact support.",
      });
    }

    const orderFilter = { razorpayOrderId, user: user._id, course: course._id };
    const order = await CourseOrder.findOneAndUpdate(
      { ...orderFilter, status: "created" },
      { status: "completed", razorpayPaymentId, razorpaySignature, paidAt: new Date() },
      { returnDocument: "after" }
    );

    if (!order) {
      const existingOrder = await CourseOrder.findOne(orderFilter);
      if (existingOrder?.status === "completed") {
        return res.status(200).json({
          success: true,
          message: "Payment already verified.",
          payment: {
            id: existingOrder.razorpayPaymentId,
            orderId: existingOrder.razorpayOrderId,
            amount: existingOrder.amount,
          },
        });
      }

      console.warn("No pending order found for verified payment:", razorpayOrderId);
      return res.status(400).json({ success: false, message: "No matching payment order found." });
    }

    let application = await CourseApplication.findOne({ student: user._id, course: course._id });
    if (application) {
      application.status = "Enrolled";
      await application.save();
    } else {
      application = await CourseApplication.create({
        student: user._id,
        course: course._id,
        status: "Enrolled",
        progress: 0,
      });
    }

    await Enrollment.findOneAndUpdate(
      { userId: user._id, courseId: course._id },
      {
        userId: user._id,
        courseId: course._id,
        enrolledRole: user.userType || "student",
        status: "Enrolled",
        progressPercentage: 0,
        lastAccessedAt: new Date(),
      },
      { upsert: true, new: true }
    ).catch(() => {});

    try {
      await Notification.create({
        recipient: user._id,
        recipientId: user._id,
        sender: "E2Job Payments",
        senderRole: "system",
        title: "Payment Confirmed! 💳",
        preview: `Your enrollment in ${course.title} is now active.`,
        message: `Your payment of ₹${course.price} for "${course.title}" was verified successfully. Order ID: ${razorpayOrderId}`,
        category: "payment",
        link: "/student/courses",
      });
    } catch (notifErr) {
      console.warn("Non-blocking notification warning:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully and course unlocked!",
      payment: {
        id: razorpayPaymentId,
        orderId: razorpayOrderId,
        amount: course.price,
      },
      application,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. GET CANDIDATE'S ORDERS & RECEIPTS
// GET /api/payment/my-orders
// ==========================================
exports.getMyOrders = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const orders = await CourseOrder.find({ user: user._id })
      .populate("course", "title description thumbnail price category duration durationUnit")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load order history",
      error: error.message,
    });
  }
};

// ==========================================
// 4. GET SPECIFIC PAYMENT RECEIPT
// GET /api/payment/receipt/:paymentId
// ==========================================
exports.getPaymentReceipt = async (req, res) => {
  try {
    const user = req.user;
    const { paymentId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const order = await CourseOrder.findOne({
      user: user._id,
      $or: [{ razorpayPaymentId: paymentId }, { razorpayOrderId: paymentId }],
    }).populate("course", "title description thumbnail price category duration");

    if (!order) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Get Receipt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch receipt",
      error: error.message,
    });
  }
};

// ==========================================
// 5. RAZORPAY WEBHOOK HANDLER
// POST /api/payment/webhook
// ==========================================
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"] || "";

    if (!webhookSecret) {
      console.warn("Payment Webhook: RAZORPAY_WEBHOOK_SECRET is not configured");
      return res.status(503).json({ success: false, message: "Webhook secret is not configured" });
    }

    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing x-razorpay-signature header" });
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.warn("Payment Webhook: Invalid webhook signature");
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body?.event;
    const payload = req.body?.payload || {};

    await AuditLog.create({
      action: "PAYMENT_WEBHOOK_RECEIVED",
      module: "Settings",
      target: event || "Razorpay Webhook",
      details: `Event: ${event}, Event ID: ${eventId}`,
      ipAddress: req.ip || "127.0.0.1",
    }).catch(() => {});

    // EVENT 1: PAYMENT CAPTURED / ORDER PAID
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payment?.entity || {};
      const orderEntity = payload.order?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;

      if (!razorpayOrderId) {
        return res.status(200).json({ success: true, message: "No order ID in event payload" });
      }

      const order = await CourseOrder.findOne({ razorpayOrderId });
      if (!order) {
        console.warn(`Payment Webhook: Order ${razorpayOrderId} not found in database`);
        return res.status(200).json({ success: true, message: "Order not found; recorded for review" });
      }

      if (order.status === "completed") {
        return res.status(200).json({ success: true, message: "Order already completed" });
      }

      order.status = "completed";
      if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
      order.paidAt = new Date();
      if (eventId) {
        order.metadata = { ...(order.metadata || {}), webhookEventId: eventId };
      }
      await order.save();

      await CourseApplication.findOneAndUpdate(
        { student: order.user, course: order.course },
        { status: "Enrolled" },
        { upsert: true, new: true }
      ).catch(() => {});

      await Enrollment.findOneAndUpdate(
        { userId: order.user, courseId: order.course },
        {
          userId: order.user,
          courseId: order.course,
          status: "Enrolled",
          progressPercentage: 0,
          lastAccessedAt: new Date(),
        },
        { upsert: true, new: true }
      ).catch(() => {});

      try {
        const course = await Course.findById(order.course).select("title");
        await Notification.create({
          recipient: order.user,
          recipientId: order.user,
          sender: "E2Job Payments",
          senderRole: "system",
          title: "Payment Confirmed! 💳",
          preview: `Your enrollment in ${course?.title || "course"} is active.`,
          message: `Your payment was verified via webhook. Order ID: ${razorpayOrderId}`,
          category: "payment",
          link: "/student/courses",
        });
      } catch (notifErr) {
        console.warn("Non-blocking notification warning:", notifErr.message);
      }

      await AuditLog.create({
        action: "PAYMENT_COMPLETED",
        module: "Settings",
        target: String(order.course),
        details: `Payment fulfilled via webhook for Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`,
        ipAddress: req.ip || "127.0.0.1",
      }).catch(() => {});

      return res.status(200).json({ success: true, message: "Webhook processed and enrollment unlocked" });
    }

    // EVENT 2: PAYMENT FAILED
    if (event === "payment.failed") {
      const paymentEntity = payload.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        await CourseOrder.findOneAndUpdate(
          { razorpayOrderId, status: "created" },
          { status: "failed", metadata: { failureReason: paymentEntity.error_description } }
        ).catch(() => {});
      }
      return res.status(200).json({ success: true, message: "Payment failure recorded" });
    }

    return res.status(200).json({ success: true, message: `Event ${event} acknowledged` });
  } catch (error) {
    console.error("Payment Webhook Handler Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error processing webhook" });
  }
};
