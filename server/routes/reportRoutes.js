const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const { createUserReport } = require("../controllers/reportController");

// G11: any logged-in user can report a job or internship (limits are in the controller).
router.post("/", protect, sanitizeInputs, createUserReport);

module.exports = router;
