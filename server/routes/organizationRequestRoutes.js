const express = require("express");
const router = express.Router();
const { requestOrganizationAccess } = require("../controllers/organizationRequestController");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const { globalLimiter } = require("../middleware/rateLimitMiddleware");

// POST /api/organizations/request-access
router.post("/request-access", globalLimiter, sanitizeInputs, requestOrganizationAccess);

module.exports = router;
