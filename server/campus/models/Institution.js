const mongoose = require("mongoose");

// One university using the campus portal. A new university is a new document, not new code.
const institutionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    shortName: { type: String, trim: true, maxlength: 40, default: "" },
    logoUrl: { type: String, trim: true, maxlength: 300, default: "" },
    // Square icon for the browser tab; the wide logo is used when it is empty.
    iconUrl: { type: String, trim: true, maxlength: 300, default: "" },
    brandColor: { type: String, trim: true, maxlength: 9, default: "#0B3A82" },
    // Hostnames that open this portal, e.g. sandip.e2job.com, assessment.sandipuniversity.edu.in
    domains: [{ type: String, trim: true, lowercase: true, maxlength: 120 }],
    // Email domains allowed to sign in, e.g. sandipuniversity.edu.in
    allowedEmailDomains: [{ type: String, trim: true, lowercase: true, maxlength: 120 }],
    programName: { type: String, trim: true, maxlength: 120, default: "" },
    helpContact: { type: String, trim: true, maxlength: 160, default: "" },
    // Text for the university's own landing page; empty fields fall back to the standard copy.
    landing: {
      heroTitle: { type: String, trim: true, maxlength: 160, default: "" },
      heroText: { type: String, trim: true, maxlength: 400, default: "" },
      about: { type: String, trim: true, maxlength: 1200, default: "" },
      batchLabel: { type: String, trim: true, maxlength: 60, default: "" },
      faqs: [
        {
          _id: false,
          q: { type: String, trim: true, maxlength: 200 },
          a: { type: String, trim: true, maxlength: 800 },
        },
      ],
    },
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
    iconUrl: this.iconUrl || "",
    brandColor: this.brandColor,
    programName: this.programName,
    helpContact: this.helpContact,
    landing: {
      heroTitle: this.landing?.heroTitle || "",
      heroText: this.landing?.heroText || "",
      about: this.landing?.about || "",
      batchLabel: this.landing?.batchLabel || "",
      faqs: (this.landing?.faqs || []).map(({ q, a }) => ({ q, a })),
    },
  };
};

module.exports = mongoose.models.Institution || mongoose.model("Institution", institutionSchema);
