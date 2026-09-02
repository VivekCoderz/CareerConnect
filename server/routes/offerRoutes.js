const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/", offerController.getOffers);
router.post("/", requireEmployer, offerController.createOffer);
router.patch("/:id/respond", offerController.respondToOffer);

module.exports = router;
