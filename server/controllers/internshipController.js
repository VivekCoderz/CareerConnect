const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const { syncExternalInternships } = require("../services/externalInternships");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const { isEligibleForInternship } = require("../utils/eligibility");

exports.createInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "Complete company profile before posting internships",
      });
    }

    const internship = await Internship.create({
      ...req.body,
      employerId: profile._id,
      createdBy: req.user._id,
      companyName: profile.companyName,
      source: "CareerConnect",
      isExternal: false,
      status: req.body.status || "Published",
    });

    return res.status(201).json({
      success: true,
      message: "Internship posted successfully",
      internship,
    });
  } catch (error) {
    next(error);
  }
};

const getUserProfileFromReq = async (req) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return null;

    if (user.userType === "student") {
      return await StudentProfile.findOne({ userId: user._id });
    } else if (user.userType === "fresher") {
      return await FresherProfile.findOne({ userId: user._id });
    }
  } catch (error) {
    // ignore
  }
  return null;
};

exports.getInternships = async (req, res, next) => {
  try {
    const { q, location, workMode, source, myPosts, status } = req.query;
    const filter = {};

    if (myPosts === "true") {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      const profile = await EmployerProfile.findOne({ userId: req.user._id });
      if (!profile) {
        return res.json({ success: true, count: 0, internships: [] });
      }
      filter.employerId = profile._id;
    } else {
      filter.status = status || "Published";
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { companyName: { $regex: q, $options: "i" } },
        { requiredSkills: { $in: [new RegExp(q, "i")] } },
      ];
    }
    if (location) filter.location = { $regex: location, $options: "i" };
    if (workMode) filter.workMode = workMode;
    if (source === "campus") filter.isExternal = false;
    if (source === "external") filter.isExternal = true;

    const internships = await Internship.find(filter)
      .populate("employerId", "companyName logo industry headquarters")
      .sort({ createdAt: -1 })
      .limit(50);

    let filteredInternships = internships;
    if (myPosts !== "true") {
      const profile = await getUserProfileFromReq(req);
      if (profile) {
        filteredInternships = internships.filter((item) =>
          isEligibleForInternship(item, profile)
        );
      }
    }

    return res.json({
      success: true,
      count: filteredInternships.length,
      internships: filteredInternships,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInternshipById = async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id).populate(
      "employerId",
      "companyName logo industry headquarters website"
    );

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    internship.viewsCount = (internship.viewsCount || 0) + 1;
    await internship.save();

    return res.json({ success: true, internship });
  } catch (error) {
    next(error);
  }
};

exports.updateInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOne({
      _id: req.params.id,
      employerId: profile?._id,
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    ["employerId", "createdBy", "source", "isExternal", "externalId"].forEach(
      (k) => delete req.body[k]
    );

    Object.assign(internship, req.body);
    await internship.save();

    return res.json({ success: true, message: "Updated", internship });
  } catch (error) {
    next(error);
  }
};

exports.updateInternshipStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["Draft", "Published", "Paused", "Closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOneAndUpdate(
      { _id: req.params.id, employerId: profile?._id },
      { status },
      { new: true }
    );

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    return res.json({ success: true, internship });
  } catch (error) {
    next(error);
  }
};

exports.deleteInternship = async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    const internship = await Internship.findOneAndDelete({
      _id: req.params.id,
      employerId: profile?._id,
    });

    if (!internship) {
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    return res.json({ success: true, message: "Internship deleted" });
  } catch (error) {
    next(error);
  }
};

// Sync external APIs into DB
exports.syncFromExternalAPIs = async (req, res, next) => {
  try {
    const result = await syncExternalInternships();
    return res.json({
      success: true,
      message: "External internships synced",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};