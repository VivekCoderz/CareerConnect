const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const { createTicket, getMyTickets, getMyTicket, submitFeedback } = require("../controllers/supportTicketController");

// Any signed-in student, fresher, professional or employer; each sees only their own tickets.
// The admin side lives under /api/admin/support-tickets.
router.use(protect);
router.post("/", sanitizeInputs, createTicket);
router.get("/", getMyTickets);
router.get("/:id", getMyTicket);
router.post("/:id/feedback", sanitizeInputs, submitFeedback);

module.exports = router;
