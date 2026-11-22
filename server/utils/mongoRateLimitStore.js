// A store for express-rate-limit that keeps the counters in MongoDB (collection ratelimits),
// so a limit counts across every web instance instead of per process.
//
// One document per limiter + key: { _id: "<prefix><key>", hits, resetTime }. Each request is
// one atomic findOneAndUpdate, so two instances can't both read 4 and write 5. A fixed window:
// the first hit after resetTime starts a new window. A TTL index deletes expired documents.

const mongoose = require("mongoose");

const COLLECTION = "ratelimits";
let indexReady = null;

const collection = () => mongoose.connection.collection(COLLECTION);

class MongoRateLimitStore {
  /**
   * @param {string} prefix - unique per limiter, so two limiters keyed by IP don't share a count
   */
  constructor(prefix) {
    if (!prefix) throw new Error("MongoRateLimitStore needs a prefix per limiter");
    this.prefix = `${prefix}:`;
    // Counts are shared between instances, so express-rate-limit's double-count check must
    // not treat two instances as the same counter.
    this.localKeys = false;
    this.windowMs = 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
    // Once per process. Mongoose buffers this until the database is connected.
    indexReady ??= collection()
      .createIndex({ resetTime: 1 }, { expireAfterSeconds: 0, name: "expire_window" })
      .catch((err) => {
        indexReady = null;
        console.warn("[rateLimit] could not create the TTL index:", err.message);
      });
  }

  async get(key) {
    const doc = await collection().findOne({ _id: this.prefix + key });
    if (!doc || doc.resetTime <= new Date()) return undefined;
    return { totalHits: doc.hits, resetTime: doc.resetTime };
  }

  async increment(key) {
    const now = new Date();
    // Both fields read the stored values, so they agree on whether the window has ended.
    const windowEnded = { $or: [{ $not: ["$resetTime"] }, { $lte: ["$resetTime", now] }] };
    const doc = await collection().findOneAndUpdate(
      { _id: this.prefix + key },
      [
        {
          $set: {
            hits: { $cond: [windowEnded, 1, { $add: ["$hits", 1] }] },
            resetTime: { $cond: [windowEnded, new Date(now.getTime() + this.windowMs), "$resetTime"] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    );
    return { totalHits: doc.hits, resetTime: doc.resetTime };
  }

  async decrement(key) {
    await collection().updateOne({ _id: this.prefix + key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await collection().deleteOne({ _id: this.prefix + key });
  }

  async resetAll() {
    await collection().deleteMany({ _id: { $regex: `^${this.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } });
  }
}

module.exports = { MongoRateLimitStore, COLLECTION };
