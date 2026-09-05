const { generateResume, updateResume } = require("../services/aiResumeService.js");
const Resume = require("../models/Resume.js");

/**
 * POST /api/resume/generate
 * Body: { rawData, template }
 */
const generateResumeHandler = async (req, res) => {
  try {
    const { rawData, template } = req.body;

    if (!rawData || !rawData.personal) {
      return res.status(400).json({
        success: false,
        message: "rawData with personal info is required",
      });
    }

    if (!rawData.personal.fullName?.trim() || !rawData.personal.email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    // Gemini / mock – service decide karega
    const generated = await generateResume(rawData, template || "professional");

    // Optional DB save (fail hone pe bhi response return hoga)
    if (req.user?._id) {
      try {
        await Resume.findOneAndUpdate(
          { user: req.user._id },
          {
            user: req.user._id,
            rawData,
            generatedData: generated,
            selectedTemplate: template || "professional",
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.error("Resume save failed (non-blocking):", dbErr.message);
      }
    }

    return res.status(200).json(generated);
  } catch (error) {
    console.error("generateResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate resume",
      error: error.message,
    });
  }
};

/**
 * POST /api/resume/update
 * Body: { currentResume, instruction }
 */
const updateResumeHandler = async (req, res) => {
  try {
    const { currentResume, instruction } = req.body;

    if (!currentResume) {
      return res.status(400).json({
        success: false,
        message: "currentResume is required",
      });
    }

    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({
        success: false,
        message: "instruction is required",
      });
    }

    const updated = await updateResume(currentResume, String(instruction).trim());

    if (req.user?._id) {
      try {
        await Resume.findOneAndUpdate(
          { user: req.user._id },
          { generatedData: updated },
          { new: true }
        );
      } catch (dbErr) {
        console.error("Resume update save failed (non-blocking):", dbErr.message);
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: error.message,
    });
  }
};

/**
 * GET /api/resume/me
 */
const getMyResume = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const resume = await Resume.findOne({ user: req.user._id });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found",
      });
    }

    return res.status(200).json(resume);
  } catch (error) {
    console.error("getMyResume error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume",
      error: error.message,
    });
  }
};

/**
 * PUT /api/resume/manual
 * Body: { generatedData }
 */
const saveManualEdit = async (req, res) => {
  try {
    const { generatedData } = req.body;

    if (!generatedData) {
      return res.status(400).json({
        success: false,
        message: "generatedData is required",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id },
      { generatedData },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found to update",
      });
    }

    return res.status(200).json(resume);
  } catch (error) {
    console.error("saveManualEdit error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save resume",
      error: error.message,
    });
  }
};

module.exports = {
  generateResumeHandler,
  updateResumeHandler,
  getMyResume,
  saveManualEdit,
};