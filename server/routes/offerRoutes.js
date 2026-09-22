const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);

// 1. Stats must precede :id
router.get("/stats", offerController.getOfferStats);

// 2. List offers (Role-adaptive: employer sees company offers; candidate sees received offers)
router.get("/", offerController.getOffers);

// 3. Get offer by ID
router.get("/:id", offerController.getOfferById);

// 4. Create offer
router.post("/", requireEmployer, offerController.createOffer);

// 5. Update offer
router.put("/:id", requireEmployer, offerController.updateOffer);

// 6. Withdraw offer
router.patch("/:id/withdraw", requireEmployer, offerController.withdrawOffer);

// 7. Send offer
router.patch("/:id/send", requireEmployer, offerController.sendOffer);

// 8. Candidate respond (accept / reject)
router.patch("/:id/respond", offerController.respondToOffer);

module.exports = router;
