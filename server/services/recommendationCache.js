const RecommendationCache = require("../models/RecommendationCache");
const FresherProfile = require("../models/FresherProfile");
const recommendationEngine = require("./recommendationEngine");

const CACHE_TTL_MS = 10 * 60 * 1000;

const profileUpdatedAtOf = async (userId) => {
  const profile = await FresherProfile.findOne({ userId }).select("updatedAt").lean();
  return profile?.updatedAt || null;
};

const sameTime = (a, b) => (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);

/**
 * The user's recommendations, from the cache when it is under 10 minutes old and the
 * fresher profile hasn't changed since; otherwise from the engine. A new application
 * clears the entry (models/Application.js).
 */
const getRecommendations = async (userId) => {
  const profileUpdatedAt = await profileUpdatedAtOf(userId);
  const cached = await RecommendationCache.findOne({ userId, expiresAt: { $gt: new Date() } }).lean();
  if (cached && sameTime(cached.profileUpdatedAt, profileUpdatedAt)) {
    return { recommendations: cached.data, generatedAt: cached.generatedAt };
  }

  const recommendations = await recommendationEngine.generateFresherRecommendations(userId);
  const generatedAt = new Date();
  // The engine creates the profile on a first visit; stamp that one, or the next read would rebuild.
  const stamp = profileUpdatedAt || (await profileUpdatedAtOf(userId));
  try {
    await RecommendationCache.updateOne(
      { userId },
      { $set: { data: recommendations, generatedAt, profileUpdatedAt: stamp, expiresAt: new Date(generatedAt.getTime() + CACHE_TTL_MS) } },
      { upsert: true }
    );
  } catch (error) {
    // A failed cache write only costs speed on the next request; the user still gets the result.
    console.error("Recommendation cache write failed:", error.message);
  }
  return { recommendations, generatedAt };
};

const clearRecommendations = (userId) => RecommendationCache.deleteMany({ userId });

module.exports = { getRecommendations, clearRecommendations, CACHE_TTL_MS };
