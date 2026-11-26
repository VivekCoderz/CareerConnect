// C09: public career programme data (C05 files). Not the old /api/courses (LMS) routes.
const express = require("express");
const { listPrograms, findProgram } = require("../services/programCatalog");
const { optionalAuth } = require("../middleware/authMiddleware");
const verifyCaptcha = require("../middleware/captchaMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const { programEnquiryLimiter } = require("../middleware/rateLimitMiddleware");
const { loadProgram, createProgramEnquiry } = require("../controllers/programEnquiryController");

const router = express.Router();

// The data only changes with a deploy: browsers may reuse it for 10 minutes and the CDN
// for an hour. Only 200s are cached, so a 404 never outlives a newly published programme.
const PROGRAMS_CACHE_CONTROL = "public, max-age=600, s-maxage=3600";

router.get("/", (req, res) => {
  res.set("Cache-Control", PROGRAMS_CACHE_CONTROL);
  return res.status(200).json({ success: true, programs: listPrograms() });
});

router.get("/:slug", (req, res) => {
  const program = findProgram(req.params.slug);
  if (!program) {
    return res.status(404).json({ success: false, message: "Programme not found" });
  }
  res.set("Cache-Control", PROGRAMS_CACHE_CONTROL);
  return res.status(200).json({ success: true, program });
});

// C10: enquiry, with or without login. Rate limit first (no reCAPTCHA call for a flood),
// then the programme must exist, then reCAPTCHA like signup.
router.post(
  "/:slug/enquiry",
  programEnquiryLimiter,
  loadProgram,
  sanitizeInputs,
  verifyCaptcha("program_enquiry"),
  optionalAuth,
  createProgramEnquiry
);

module.exports = router;
module.exports.PROGRAMS_CACHE_CONTROL = PROGRAMS_CACHE_CONTROL;
