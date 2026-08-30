const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const fresherRoutes = require("./routes/fresherRoutes.js");
const professionalRoutes = require("./routes/professionalRoutes.js");
const employerRoutes = require("./routes/employerRoutes.js");
const courseRoutes = require("./routes/courseRoutes.js");

const courseContentRoutes = require("./routes/courseContentRoutes");


// Employer feature routes
const jobRoutes = require("./routes/jobRoutes.js");
const applicationRoutes = require("./routes/applicationRoutes.js");
const candidateRoutes = require("./routes/candidateRoutes.js");
const assessmentRoutes = require("./routes/assessmentRoutes.js");
const interviewRoutes = require("./routes/interviewRoutes.js");
const offerRoutes = require("./routes/offerRoutes.js");
const organizationRoutes = require("./routes/organizationRoutes.js");
const employerLearningRoutes = require("./routes/employerLearningRoutes.js");
const employerAnalyticsRoutes = require("./routes/employerAnalyticsRoutes.js");


const internshipRoutes = require("./routes/internshipRoutes.js");


const app = express();

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:[0-9]+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
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
app.use("/api/courses", courseContentRoutes);

// Employer Hub Routes
app.use("/api/employer", employerRoutes);
app.use("/api/employer/learning", employerLearningRoutes);
app.use("/api/employer/analytics", employerAnalyticsRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api", employerRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Global Error:", err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;