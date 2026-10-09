const User = require("../models/User");
const CareerGoal = require("../models/CareerGoal");

/**
 * GET /api/users/profile or /api/users/me
 * Get current authenticated user profile
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const careerGoal = await CareerGoal.findOne({ userId: req.user._id, status: "Active" }).lean();

    return res.status(200).json({
      success: true,
      user,
      careerGoal,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/profile
 * Update user basic profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      firstName,
      lastName,
      phone,
      bio,
      location,
      headline,
      skills,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      profileImage,
    } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (headline !== undefined) updates.headline = headline;
    if (skills !== undefined) updates.skills = Array.isArray(skills) ? skills : [];
    if (portfolioUrl !== undefined) updates.portfolioUrl = portfolioUrl;
    if (githubUrl !== undefined) updates.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select(
      "-password"
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Get public profile of a user
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("fullName firstName lastName username userType role profileImage headline bio location skills portfolioUrl githubUrl linkedinUrl createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/career-goals
 */
exports.getCareerGoals = async (req, res, next) => {
  try {
    const goals = await CareerGoal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      goals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/career-goals
 */
exports.setCareerGoal = async (req, res, next) => {
  try {
    const {
      targetRole,
      targetIndustry,
      targetSalary,
      currency,
      targetTimeline,
      preferredLocations,
      preferredWorkModes,
      targetSkillsToLearn,
      notes,
    } = req.body;

    if (!targetRole || !targetRole.trim()) {
      return res.status(400).json({ success: false, message: "Target role is required" });
    }

    // Set any previous active goals to Archived
    await CareerGoal.updateMany({ userId: req.user._id, status: "Active" }, { status: "Archived" });

    const goal = await CareerGoal.create({
      userId: req.user._id,
      targetRole: targetRole.trim(),
      targetIndustry: targetIndustry || "",
      targetSalary: Number(targetSalary) || 0,
      currency: currency || "INR (₹)",
      targetTimeline: targetTimeline || "6 Months",
      preferredLocations: Array.isArray(preferredLocations) ? preferredLocations : [],
      preferredWorkModes: Array.isArray(preferredWorkModes) ? preferredWorkModes : ["Remote", "Hybrid"],
      targetSkillsToLearn: Array.isArray(targetSkillsToLearn) ? targetSkillsToLearn : [],
      notes: notes || "",
      status: "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Career goal saved successfully",
      goal,
    });
  } catch (error) {
    next(error);
  }
};
