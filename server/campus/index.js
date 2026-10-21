const express = require("express");
const multer = require("multer");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const { resolveTenant } = require("./middleware/tenant");
const access = require("./middleware/access");
const tenant = require("./controllers/tenantController");
const auth = require("./controllers/authController");
const members = require("./controllers/membersController");
const assessment = require("./controllers/assessmentController");
const review = require("./controllers/reviewController");
const sessions = require("./controllers/sessionsController");
const manager = require("./controllers/managerController");
const managers = require("./controllers/managersController");
const { serveRaw } = require("./services/files");
const worker = require("./services/gradingWorker");

// Campus portal API, mounted at /api/campus when ENABLE_CAMPUS=true (architecture section 6).
const router = express.Router();

const memory = (maxBytes, field) => multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(field);
const sheetUpload = memory(5 * 1024 * 1024, "file");
const audioUpload = memory(3 * 1024 * 1024, "audio");
const imageUpload = memory(400 * 1024, "image");

const limiter = (windowMs, max) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => (req.user?._id ? `u:${req.user._id}` : ipKeyGenerator(req.ip || "")),
    message: { success: false, message: "Too many requests. Please wait a moment and try again." },
  });
const signInLimit = limiter(10 * 60 * 1000, 60);
// Autosave runs on every change; a 50-question test stays far below this.
const testWriteLimit = limiter(60 * 1000, 120);

// Signed links for private recordings and photos (checked inside, no tenant needed).
router.get("/files/:id/raw", serveRaw);

router.use(resolveTenant);
router.get("/tenant", tenant.tenant);

router.post("/auth/google", signInLimit, sanitizeInputs, auth.googleSignIn);
router.post("/auth/dev", signInLimit, sanitizeInputs, auth.devSignIn);
router.get("/me", access.member, auth.me);
router.post("/consent", access.member, auth.consent);

// Student
router.get("/profile", access.consentedMember, members.getProfile);
router.patch("/profile", access.consentedMember, sanitizeInputs, members.updateProfile);
router.get("/assessments", access.student, assessment.list);
router.post("/assessments/:id/start", access.student, assessment.start);
router.get("/attempts/:id", access.student, assessment.get);
router.put("/attempts/:id/answers/:qid", access.student, testWriteLimit, assessment.saveAnswer);
router.post("/attempts/:id/audio/:qid", access.student, testWriteLimit, audioUpload, assessment.saveAudio);
router.post("/attempts/:id/events", access.student, testWriteLimit, sanitizeInputs, assessment.event);
router.post("/attempts/:id/snapshot", access.student, testWriteLimit, imageUpload, assessment.snapshot);
router.post("/attempts/:id/submit", access.student, assessment.submit);
router.get("/results/:assessmentId", access.student, assessment.result);
router.get("/sessions", access.student, sessions.mySessions);
router.post("/sessions/:id/join", access.student, sessions.join);

// University manager (or E2Job admin)
router.get("/manager/overview", access.manager, manager.overview);
router.get("/manager/students", access.manager, manager.students);
router.get("/manager/attempts/:memberId/proctoring", access.manager, manager.proctoring);
router.get("/manager/reports/:name", access.manager, manager.report);

// E2Job operations
router.post("/ops/import/preview", access.admin, sheetUpload, members.previewImport);
router.post("/ops/import/commit", access.admin, sheetUpload, members.commitImport);
router.get("/ops/members", access.admin, members.listMembers);
router.post("/ops/members/:id/verify", access.admin, members.setVerification);
router.get("/ops/managers", access.admin, managers.list);
router.post("/ops/managers", access.admin, sanitizeInputs, managers.add);
router.post("/ops/managers/:id/remove", access.admin, managers.remove);
router.get("/ops/assessments", access.admin, review.listAssessments);
router.patch("/ops/assessments/:id", access.admin, review.schedule);
router.get("/ops/assessments/:id/review", access.admin, review.review);
router.post("/ops/assessments/:id/publish", access.admin, review.publish);
router.get("/ops/attempts/:id", access.admin, review.attemptDetail);
router.patch("/ops/attempts/:id/marks/:qid", access.admin, sanitizeInputs, review.setMark);
router.get("/ops/sessions", access.admin, sessions.listAll);
router.post("/ops/sessions", access.admin, sanitizeInputs, sessions.create);
router.delete("/ops/sessions/:id", access.admin, sessions.cancel);
router.post("/ops/sessions/import", access.admin, sheetUpload, sessions.importSchedule);

// Upload errors (file too large, wrong field) as a clear 400 instead of a server error.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "The file is too large." : "The upload could not be read.";
    return res.status(400).json({ success: false, message });
  }
  return next(err);
});

module.exports = { router, startWorkers: worker.start, stopWorkers: worker.stop };
