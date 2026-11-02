const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Skill name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      enum: [
        "Frontend",
        "Backend",
        "Full Stack",
        "Mobile Development",
        "Data Science & AI",
        "Machine Learning",
        "DevOps & Cloud",
        "Database",
        "UI/UX Design",
        "Testing & QA",
        "Cybersecurity",
        "Blockchain",
        "Soft Skills",
        "Management & Leadership",
        "Other",
      ],
      default: "Other",
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    demandScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    relatedSkills: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

skillSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  next();
});

module.exports = mongoose.model("Skill", skillSchema);
