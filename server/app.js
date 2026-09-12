require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const fresherRoutes = require("./routes/fresherRoutes.js");
const professionalRoutes = require("./routes/professionalRoutes.js");
const employerRoutes = require("./routes/employerRoutes.js");

// Courses related Routes
const courseRoutes = require("./routes/courseRoutes.js");
const courseContentRoutes = require("./routes/courseContentRoutes");


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

const resumeRoutes = require("./routes/resumeRoutes.js");
const opportunityRoutes = require("./routes/opportunityRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");
const aiAssistantRoutes = require("./routes/aiAssistantRoutes.js");

const app = express();
app.set("trust proxy", 1);

// Allowed origins for CORS (loaded from CLIENT_URL in .env + local development fallbacks)
const allowedOrigins = [
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
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach((url) => {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:[0-9]+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

// Base & User Profile Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/profile/student", studentRoutes);
app.use("/api/fresher", fresherRoutes);
app.use("/api/profile/fresher", fresherRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/profile/professional", professionalRoutes);

// Core LMS Course Routes
app.use("/api/courses", courseRoutes);
app.use("/api/course-content", courseContentRoutes);

// Marketplace & Discovery Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/candidates", candidateRoutes);

// Employer Hub Routes
app.use("/api/employer", employerRoutes);
app.use("/api/employer/learning", employerLearningRoutes);
app.use("/api/employer/analytics", employerAnalyticsRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/api/resume", resumeRoutes); // Safety alias
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/feed", opportunityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.get("/api/companies/:companyId", require("./controllers/employerController").getPublicCompanyProfile);

// Gateway Health Check Endpoint
app.get("/", (req, res) => {
  return res.status(200).json({
    status: "active",
    message: "CareerConnect API Gateway is running smoothly 🚀",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "active", node: "GU Gateway Matrix Engine" });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("Server Global Error:", err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;