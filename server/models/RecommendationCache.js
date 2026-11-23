const mongoose = require("mongoose");

// One user's recommendation result (services/recommendationEngine.js), kept for a few minutes
// so filter changes on the recommendation pages don't rerun the engine (H19). Stored in
// MongoDB rather than memory so every web instance shares it.
const recommendationCacheSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, required: true },
    // The fresher profile's updatedAt when the result was built; a newer profile means stale.
    profileUpdatedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { minimize: false }
);

// MongoDB removes an entry shortly after expiresAt; reads also check it, since that sweep runs about once a minute.
recommendationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RecommendationCache", recommendationCacheSchema);
