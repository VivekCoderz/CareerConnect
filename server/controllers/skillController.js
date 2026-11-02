const Skill = require("../models/Skill");

// Common initial standard skills fallback
const DEFAULT_SKILLS = [
  { name: "JavaScript", category: "Frontend", isTrending: true, demandScore: 95 },
  { name: "React", category: "Frontend", isTrending: true, demandScore: 92 },
  { name: "Node.js", category: "Backend", isTrending: true, demandScore: 90 },
  { name: "Python", category: "Backend", isTrending: true, demandScore: 94 },
  { name: "TypeScript", category: "Full Stack", isTrending: true, demandScore: 89 },
  { name: "Java", category: "Backend", isTrending: false, demandScore: 85 },
  { name: "C++", category: "Backend", isTrending: false, demandScore: 80 },
  { name: "SQL", category: "Database", isTrending: false, demandScore: 88 },
  { name: "MongoDB", category: "Database", isTrending: true, demandScore: 86 },
  { name: "Docker", category: "DevOps & Cloud", isTrending: true, demandScore: 87 },
  { name: "AWS", category: "DevOps & Cloud", isTrending: true, demandScore: 91 },
  { name: "Git", category: "Soft Skills", isTrending: false, demandScore: 90 },
  { name: "Machine Learning", category: "Data Science & AI", isTrending: true, demandScore: 93 },
  { name: "Flutter", category: "Mobile Development", isTrending: true, demandScore: 82 },
  { name: "Figma", category: "UI/UX Design", isTrending: true, demandScore: 84 },
];

/**
 * GET /api/skills
 * List and search skills with optional category filter
 */
exports.getSkills = async (req, res, next) => {
  try {
    const { search, category, trending, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (trending === "true") {
      filter.isTrending = true;
    }

    const total = await Skill.countDocuments(filter);
    let skills = await Skill.find(filter)
      .sort({ demandScore: -1, name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // If database has 0 skills yet, seed defaults on the fly
    if (skills.length === 0 && !search && (!category || category === "All") && total === 0) {
      await Skill.insertMany(DEFAULT_SKILLS).catch(() => {});
      skills = await Skill.find().sort({ demandScore: -1 }).limit(Number(limit)).lean();
    }

    return res.status(200).json({
      success: true,
      count: skills.length,
      total,
      skills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/skills/trending
 * Return top trending skills across industry
 */
exports.getTrendingSkills = async (req, res, next) => {
  try {
    let trendingSkills = await Skill.find({ isTrending: true })
      .sort({ demandScore: -1 })
      .limit(15)
      .lean();

    if (trendingSkills.length === 0) {
      trendingSkills = await Skill.find().sort({ demandScore: -1 }).limit(10).lean();
    }

    return res.status(200).json({
      success: true,
      skills: trendingSkills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/skills/:id
 */
exports.getSkillById = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }
    return res.status(200).json({ success: true, skill });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/skills
 * Create a new skill (Admin or authorized roles)
 */
exports.createSkill = async (req, res, next) => {
  try {
    const { name, category, description, isTrending, demandScore, relatedSkills } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Skill name is required" });
    }

    const existing = await Skill.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Skill with this name already exists", skill: existing });
    }

    const skill = await Skill.create({
      name: name.trim(),
      category: category || "Other",
      description: description || "",
      isTrending: Boolean(isTrending),
      demandScore: Number(demandScore) || 50,
      relatedSkills: Array.isArray(relatedSkills) ? relatedSkills : [],
    });

    return res.status(201).json({
      success: true,
      message: "Skill created successfully",
      skill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/skills/:id
 */
exports.updateSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Skill updated successfully",
      skill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/skills/:id
 */
exports.deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Skill deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
