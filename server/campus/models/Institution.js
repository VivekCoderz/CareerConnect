const mongoose = require("mongoose");

// One university using the campus portal. A new university is a new document, not new code.
const institutionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    shortName: { type: String, trim: true, maxlength: 40, default: "" },
    logoUrl: { type: String, trim: true, maxlength: 300, default: "" },
    brandColor: { type: String, trim: true, maxlength: 9, default: "#0B3A82" },
    // Hostnames that open this portal, e.g. sandip.e2job.com, assessment.sandipuniversity.edu.in
    domains: [{ type: String, trim: true, lowercase: true, maxlength: 120 }],
    // Email domains allowed to sign in, e.g. sandipuniversity.edu.in
    allowedEmailDomains: [{ type: String, trim: true, lowercase: true, maxlength: 120 }],
    programName: { type: String, trim: true, maxlength: 120, default: "" },
    helpContact: { type: String, trim: true, maxlength: 160, default: "support@e2job.com" },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true }
);

institutionSchema.index({ domains: 1 });

/** Fields any visitor of the portal may see. */
institutionSchema.methods.toPublic = function toPublic() {
  return {
    slug: this.slug,
    name: this.name,
    shortName: this.shortName || this.name,
    logoUrl: this.logoUrl,
    brandColor: this.brandColor,
    programName: this.programName,
    helpContact: this.helpContact,
  };
};

module.exports = mongoose.models.Institution || mongoose.model("Institution", institutionSchema);
