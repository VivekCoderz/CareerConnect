const Application = require("../models/Application");
const EmployerProfile = require("../models/EmployerProfile");
const ResumeAsset = require("../models/ResumeAsset");
const { cloudinary } = require("../config/cloudinary");

const getResumeDownload = async (req, res, next) => {
  try {
    const url = req.query.url;
    if (typeof url !== "string" || url.length > 2048) {
      return res.status(400).json({ success: false, message: "Invalid resume reference" });
    }

    const asset = await ResumeAsset.findOne({ url }).lean();
    if (!asset) return res.status(404).json({ success: false, message: "Resume not found" });

    const userId = req.user._id.toString();
    let authorized = asset.user.toString() === userId || req.user.role === "admin";
    if (!authorized && (req.user.role === "employer" || req.user.userType === "employer")) {
      const profile = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
      if (profile) {
        authorized = Boolean(await Application.exists({
          employerId: profile._id,
          candidateId: asset.user,
          resumeUrl: asset.url,
        }));
      }
    }
    if (!authorized) return res.status(403).json({ success: false, message: "Resume access denied" });

    const format = asset.publicId.slice(asset.publicId.lastIndexOf(".") + 1);
    const signedUrl = cloudinary.utils.private_download_url(asset.publicId, format, {
      resource_type: "raw",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 60,
      attachment: false,
    });
    res.set("Cache-Control", "private, no-store");
    return res.redirect(302, signedUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = { getResumeDownload };
