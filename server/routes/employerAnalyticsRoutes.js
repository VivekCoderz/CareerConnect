const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/employerAnalyticsController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);
router.use(requireEmployer);

router.get("/", analyticsController.getAnalytics);

module.exports = router;
