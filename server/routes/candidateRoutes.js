const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);
router.use(requireEmployer);

router.get("/search", candidateController.searchCandidates);
router.get("/:id", candidateController.getCandidateById);

module.exports = router;
