const Course = require("../models/Course");
const CourseApplication = require("../models/CourseApplication");
const CourseProgress = require("../models/CourseProgress");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { razorpay, verifyRazorpaySignature } = require("../config/razorpay");
const { broadcastRealtimeNotification } = require("../services/notificationService");

// ==========================================
// CREATE RAZORPAY ORDER FOR COURSE
// POST /api/payment/create-order
// ==========================================
const createCourseOrder = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // 1. Fetch and validate course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.status !== "Published") {
      return res.status(400).json({
        success: false,
        message: "This course is not currently available for enrollment",
      });
    }

    // 2. Check if user is already enrolled
    const existingEnrollment = await CourseApplication.findOne({
      student: user._id,
      course: course._id,
      status: "Enrolled",
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course",
        isEnrolled: true,
      });
    }

    // 3. Handle Free Courses (price === 0)
    if (!course.price || course.price <= 0) {
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
        });
      }

      // Initialize progress
      let progress = await CourseProgress.findOne({
        student: user._id,
        course: course._id,
      });

      if (!progress) {
        await CourseProgress.create({
          student: user._id,
          course: course._id,
          completedContents: [],
          progress: 0,
        });
      }

      return res.status(200).json({
        success: true,
        isFree: true,
        message: "Successfully enrolled in free course!",
        course: {
          _id: course._id,
          title: course.title,
        },
      });
    }

    // 4. Create Razorpay Order for Paid Course
    const amountInPaise = Math.round(course.price * 100);
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${user._id.toString().slice(-4)}`;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: user._id.toString(),
        courseId: course._id.toString(),
        userType: user.userType || "student",
        courseTitle: course.title.slice(0, 40),
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // 5. Persist order in Payment collection
    const payment = await Payment.create({
      user: user._id,
      userType: user.userType || "student",
      course: course._id,
      amount: course.price,
      currency: "INR",
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      receipt,
      notes: options.notes,
    });

    const candidateName =
      user.fullName ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username ||
      "Student";

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TbSS4kb8G70xwq",
      course: {
        _id: course._id,
        title: course.title,
        price: course.price,
        thumbnail: course.thumbnail,
      },
      prefill: {
        name: candidateName,
        email: user.email,
        contact: user.phone || "",
      },
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Create Course Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate payment order",
    });
  }
};

// ==========================================
// VERIFY RAZORPAY PAYMENT
// POST /api/payment/verify
// ==========================================
const verifyCoursePayment = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      courseId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !courseId) {
      return res.status(400).json({
        success: false,
        message: "razorpayOrderId, razorpayPaymentId, razorpaySignature, and courseId are required",
      });
    }

    // 1. Verify HMAC-SHA256 signature
    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    // 2. Find the payment record
    const payment = await Payment.findOne({ razorpayOrderId });

    if (!isValidSignature) {
      if (payment) {
        payment.status = "failed";
        payment.failureReason = "Signature mismatch / tamper detected";
        await payment.save();
      }

      return res.status(400).json({
        success: false,
        message: "Payment verification failed: invalid signature",
      });
    }

    // 3. Mark payment as completed
    if (payment) {
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.status = "completed";
      payment.paidAt = new Date();
      await payment.save();
    }

    // 4. Enroll user in CourseApplication
    let application = await CourseApplication.findOne({
      student: user._id,
      course: courseId,
    });

    if (application) {
      application.status = "Enrolled";
      await application.save();
    } else {
      application = await CourseApplication.create({
        student: user._id,
        course: courseId,
        status: "Enrolled",
      });
    }

    // 5. Initialize CourseProgress
    let progress = await CourseProgress.findOne({
      student: user._id,
      course: courseId,
    });

    if (!progress) {
      progress = await CourseProgress.create({
        student: user._id,
        course: courseId,
        completedContents: [],
        progress: 0,
      });
    }

    // 6. Fetch course info and dispatch in-app notification
    const course = await Course.findById(courseId);

    try {
      const notif = await Notification.create({
        recipient: user._id,
        category: "course",
        title: `Payment Confirmed: ${course?.title || "Course"}`,
        preview: `Your payment of ₹${payment?.amount || course?.price || 0} is successful. All learning content is unlocked!`,
        content: `Dear Learner,\n\nYour enrollment for "${course?.title || "Course"}" is now active.\n\nTransaction Details:\n• Payment ID: ${razorpayPaymentId}\n• Order ID: ${razorpayOrderId}\n• Amount Paid: ₹${payment?.amount || course?.price || 0}\n• Status: Confirmed & Completed\n\nYou have immediate full access to all curriculum modules, videos, and study notes.`,
        actionUrl: `/courses/${courseId}`,
        actionText: "Start Learning ›",
      });

      broadcastRealtimeNotification(notif, user._id);
    } catch (notifError) {
      console.warn("Could not dispatch payment notification:", notifError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment successfully verified! You are now enrolled.",
      payment: {
        id: payment?._id,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        amount: payment?.amount || course?.price,
        paidAt: payment?.paidAt || new Date(),
        courseId,
        courseTitle: course?.title,
      },
    });
  } catch (error) {
    console.error("Verify Course Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};

// ==========================================
// GET MY ORDERS / PAYMENTS
// GET /api/payment/my-orders
// ==========================================
const getMyOrders = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payments = await Payment.find({ user: user._id })
      .populate("course", "title thumbnail domain category level duration durationUnit price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      orders: payments,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// ==========================================
// GET ORDER RECEIPT
// GET /api/payment/receipt/:paymentId
// ==========================================
const getPaymentReceipt = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      _id: paymentId,
      user: user._id,
    }).populate("course", "title thumbnail price domain category level duration durationUnit");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    return res.status(200).json({
      success: true,
      receipt: payment,
    });
  } catch (error) {
    console.error("Get Receipt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment receipt",
    });
  }
};

module.exports = {
  createCourseOrder,
  verifyCoursePayment,
  getMyOrders,
  getPaymentReceipt,
};
