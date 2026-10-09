require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const cookieOriginMiddleware = require("./middleware/cookieOriginMiddleware");

const maintenanceMode = require("./middleware/maintenanceMode");
const { requireTextFields } = require("./middleware/textFields");
const { parseClientUrls, isLocalDevOrigin } = require("./utils/clientOrigins");

const authRoutes = require("./routes/authRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const fresherRoutes = require("./routes/fresherRoutes.js");
const professionalRoutes = require("./routes/professionalRoutes.js");
const employerRoutes = require("./routes/employerRoutes.js");

// Courses related Routes
const courseRoutes = require("./routes/courseRoutes.js");
const courseContentRoutes = require("./routes/courseContentRoutes");
const paymentRoutes = require("./routes/paymentRoutes.js");

// Employer & Jobs / Internships feature routes
const jobRoutes = require("./routes/jobRoutes.js");
const internshipRoutes = require("./routes/internshipRoutes.js");
const applicationRoutes = require("./routes/applicationRoutes.js");
const candidateRoutes = require("./routes/candidateRoutes.js");
const assessmentRoutes = require("./routes/assessmentRoutes.js");
const interviewRoutes = require("./routes/interviewRoutes.js");
const offerRoutes = require("./routes/offerRoutes.js");
const organizationRoutes = require("./routes/organizationRoutes.js");
const employerLearningRoutes = require("./routes/employerLearningRoutes.js");
const employerAnalyticsRoutes = require("./routes/employerAnalyticsRoutes.js");
const recommendationRoutes = require("./routes/recommendationRoutes.js");
const resumeRoutes = require("./routes/resumeRoutes.js");
const opportunityRoutes = require("./routes/opportunityRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const aiAssistantRoutes = require("./routes/aiAssistantRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");
const { configureTrustProxy } = require("./config/trustProxy");
const { globalLimiter } = require("./middleware/rateLimitMiddleware");
const dbStatus = require("./utils/dbStatus");
const Sentry = require("@sentry/node");

const app = express();
configureTrustProxy(app);

// Gzip responses over 1 KB (job and internship lists in particular)
app.use(compression());

const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Allowed origins for CORS (loaded from CLIENT_URL in .env + local development fallbacks)
const allowedOrigins = isProduction ? [] : [
  "https://careerconnect-v1.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

// Dynamically load allowed origins from CLIENT_URL in environment (supports comma-separated list)
parseClientUrls().forEach((url) => {
  if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      (!isProduction && isLocalDevOrigin(origin));

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],

  preflightContinue: false,

  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly for all routes (Express 5 wildcard syntax)
app.options("/{*path}", cors(corsOptions));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cookieOriginMiddleware(allowedOrigins, isProduction));

// Global rate limiting for all API endpoints
app.use("/api", globalLimiter);

// Platform maintenance mode: blocks non-admin writes with 503
app.use("/api", maintenanceMode);

// Optional temporary IP Debug route (enabled ONLY when ENABLE_IP_DEBUG === "true")
if (process.env.ENABLE_IP_DEBUG === "true") {
  app.get("/api/_debug/ip", (req, res) => {
    return res.status(200).json({
      ip: req.ip,
      xff: req.headers["x-forwarded-for"],
    });
  });
}

// Base & User Profile Routes
// Text fields must be text and meeting links http(s) on the job portal write routes.
app.use(["/api/jobs", "/api/internships", "/api/applications", "/api/admin", "/api/interviews", "/api/offers"], requireTextFields);

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/profile/student", studentRoutes);
app.use("/api/fresher", fresherRoutes);
app.use("/api/profile/fresher", fresherRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/profile/professional", professionalRoutes);

const flag = (name) => String(process.env[name]).toLowerCase() === "true";

// Core LMS Course Routes
if (flag("ENABLE_COURSES")) app.use("/api/courses", courseRoutes);
if (flag("ENABLE_COURSES")) app.use("/api/courses", courseContentRoutes);
if (flag("ENABLE_COURSES")) app.use("/api/course-content", courseContentRoutes);
if (flag("ENABLE_PAYMENTS")) app.use("/api/payment", paymentRoutes);

// Marketplace & Discovery Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/candidates", candidateRoutes);

// Employer Hub Routes
if (!flag("ENABLE_COURSES")) app.use("/api/employer/learning", (req, res) => res.status(404).json({ success: false, message: "Not found" }));
app.use("/api/employer", employerRoutes);
if (flag("ENABLE_COURSES")) app.use("/api/employer/learning", employerLearningRoutes);
app.use("/api/employer/analytics", employerAnalyticsRoutes);
if (flag("ENABLE_ASSESSMENTS")) app.use("/api/assessments", assessmentRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/organizations", require("./routes/organizationRequestRoutes"));
app.use("/api/organization-requests", require("./routes/organizationRequestRoutes"));
app.use("/api/resume", resumeRoutes);
app.use("/api/api/resume", resumeRoutes); // Safety alias
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/feed", opportunityRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/fresher/recommendations", recommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/companies/:companyId", require("./controllers/employerController").getPublicCompanyProfile);

// G02: public sitemap (www.e2job.com/sitemap.xml is rewritten here by client/vercel.json).
app.get("/sitemap.xml", require("./controllers/sitemapController").getSitemap);

// Gateway Health Check Endpoint
app.get("/", (req, res) => {
  return res.status(200).json({
    status: "active",
    message: "E2Job API Gateway is running smoothly 🚀",
    timestamp: new Date().toISOString(),
  });
});

// UptimeRobot pings this every 5 minutes: it keeps Render awake and alerts
// the team when the API or the database is down.
app.get("/health", (req, res) => {
  const databaseConnected = dbStatus.isDatabaseConnected();
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "OK" : "degraded",
    database: databaseConnected ? "connected" : "unavailable",
    message: databaseConnected ? "E2Job backend is running" : "Database unavailable",
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.code === 11000) {
    const keys = err.keyPattern || err.keyValue || {};
    const field = ["phone", "email", "username"].find((key) => keys[key] !== undefined);
    const message = field === "phone"
      ? "This mobile number is already registered with another account"
      : field === "email"
        ? "This email is already registered"
        : field === "username"
          ? "This username is already taken"
          : "This account is already registered";
    return res.status(409).json({ success: false, field, message });
  }
  // Bad input (wrong type, unknown enum value, malformed ID) is the client's
  // mistake: answer 400 and name the field instead of leaking a Mongoose error.
  if (err.name === "ValidationError") {
    const fields = Object.keys(err.errors || {});
    return res.status(400).json({
      success: false,
      fields,
      message: fields.length ? `Invalid value for: ${fields.join(", ")}` : "Invalid input",
    });
  }
  if (err.name === "CastError") {
    const field = err.path === "_id" ? "id" : err.path;
    return res.status(400).json({ success: false, fields: [field], message: `Invalid value for: ${field}` });
  }
  console.error("Server Global Error:", err);
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.statusCode || err.status || 500;
  // Server faults go to Sentry (a no-op without SENTRY_DSN). Rejected CORS origins are not bugs.
  if (status >= 500 && !String(err.message).startsWith("Not allowed by CORS")) {
    Sentry.captureException(err, { tags: { status_code: status, route: req.route?.path || req.baseUrl || req.path } });
  }
  return res.status(status).json({
    success: false,
    message: status >= 500 && isProduction ? "Internal server error" : err.message || "Internal server error",
  });
});

module.exports = app;
