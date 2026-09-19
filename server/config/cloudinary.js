require("dotenv").config();
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const ResumeAsset = require("../models/ResumeAsset");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.Cloudinary_API_Key ,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.Cloudinary_API_Secret
});

/**
 * Upload resume buffer to Cloudinary
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {string} originalName - Original file name
 * @param {string} userId - User ID string
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadResumeToCloudinary = (fileBuffer, originalName = "resume.pdf", userId = "user") => {
  return new Promise((resolve, reject) => {
    const extMatch = (originalName || "").match(/\.[^/.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : ".pdf";
    const publicId = `resume_${crypto.randomUUID()}${ext}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "careerconnect/resumes",
        resource_type: "raw",
        type: "authenticated",
        public_id: publicId,
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        try {
          await ResumeAsset.create({ user: userId, publicId: result.public_id, url: result.secure_url });
          resolve(result);
        } catch (saveError) {
          try {
            await cloudinary.uploader.destroy(result.public_id, { resource_type: "raw", type: "authenticated" });
          } catch (cleanupError) {
            console.error("Orphaned resume asset cleanup failed:", cleanupError);
          }
          reject(saveError);
        }
      }
    );

    stream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  uploadResumeToCloudinary,
};
