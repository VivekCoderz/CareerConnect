const crypto = require("crypto");
const axios = require("axios");
const Course = require("../models/Course");
const CourseOrder = require("../models/CourseOrder");
const CourseApplication = require("../models/CourseApplication");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");

// ==========================================
// CONFIGURATION & CREDENTIALS
// ==========================================
// Read at request time so credentials only ever come from the environment.
function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

function paymentsNotConfigured(res) {
  return res.status(503).json({
    success: false,
    message: "Payments are not configured",
  });
}

/**
 * Constant-time check of Razorpay's HMAC SHA256 signature
 */
function isValidRazorpaySignature(orderId, paymentId, signature, secret) {
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  );
  const received = Buffer.from(String(signature));
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/**
 * Helper to call Razorpay Orders API via Axios
 */
async function callRazorpayCreateOrder(config, amountInPaise, currency = "INR", receipt, notes = {}) {
  try {
    const authHeader =
      "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");

    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        timeout: 9000,
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.warn("Razorpay API Call Warning:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

// ==========================================
// 1. CREATE ORDER / FREE ENROLLMENT
// POST /api/payment/create-order
// ==========================================
exports.createOrder = async (req, res) => {
  try {
    const user = req.user;
    const { courseId } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "Published") {
      return res.status(404).json({
        success: false,
        message: "Course not found or is not published",
      });
    }

    // Check if user is already enrolled
    const existingEnrollment = await CourseApplication.findOne({
      student: user._id,
      course: course._id,
      status: { $in: ["Enrolled", "Completed"] },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course",
      });
    }

    // ------------------------------------------
    // CASE A: FREE COURSE (Price is 0 or undefined)
    // ------------------------------------------
    const coursePrice = Number(course.price) || 0;
    if (coursePrice <= 0) {
      // 1. Create or update CourseApplication to Enrolled
      let application = await CourseApplication.findOne({
        student: user._id,
        course: course._id,
      });

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

      // 2. Sync to Enrollment model
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

      // 3. Create zero-amount order record for student's receipts history
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

      // 4. Send confirmation notification
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
        // Non-blocking notification
      }

      return res.status(200).json({
        success: true,
        isFree: true,
        message: "Enrolled in free course successfully!",
        courseId: course._id,
      });
    }

    // ------------------------------------------
    // CASE B: PAID COURSE (Create Razorpay Order)
    // ------------------------------------------
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

    // Save pending CourseOrder
    await CourseOrder.create({
      user: user._id,
      course: course._id,
      amount: coursePrice,
      currency: "INR",
      status: "created",
      isFree: false,
      receipt: receiptId,
      razorpayOrderId,
      metadata: {
        amountInPaise,
      },
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
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
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
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ------------------------------------------
    // Verify Cryptographic Signature
    // ------------------------------------------
    const { keySecret } = razorpayConfig;
    if (!isValidRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)) {
      console.warn("Payment signature verification failed for order:", razorpayOrderId);
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Please contact support.",
      });
    }

    // ------------------------------------------
    // Complete the user's own pending order (never create one here)
    // ------------------------------------------
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
      return res.status(400).json({
        success: false,
        message: "No matching payment order found.",
      });
    }

    // ------------------------------------------
    // Enroll the Candidate
    // ------------------------------------------
    let application = await CourseApplication.findOne({
      student: user._id,
      course: course._id,
    });

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

    // Sync to Enrollment model
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

    // Send confirmation notification
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
      // Non-blocking notification
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
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orders = await CourseOrder.find({ user: user._id })
      .populate("course", "title description thumbnail price category duration durationUnit")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
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
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const order = await CourseOrder.findOne({
      user: user._id,
      $or: [{ razorpayPaymentId: paymentId }, { razorpayOrderId: paymentId }],
    }).populate("course", "title description thumbnail price category duration");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Receipt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch receipt",
      error: error.message,
    });
  }
};
