const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Native MongoDB TTL index: automatically deletes expired sessions
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  }
);

module.exports = mongoose.model("Session", sessionSchema);
