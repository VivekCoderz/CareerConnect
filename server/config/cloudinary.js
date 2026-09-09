require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloudinary_Cloud_Name || "dqe3aiebn",
  api_key: process.env.CLOUDINARY_API_KEY || process.env.Cloudinary_API_Key,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.Cloudinary_API_Secret || "Fq3vgRwDpemBB0tWSlFPLMDLOYk",
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
    const baseName = (originalName || "resume").replace(/\.[^/.]+$/, "");
    const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "resume";
    const publicId = `resume_${userId}_${cleanName}_${Date.now()}${ext}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "careerconnect/resumes",
        resource_type: "raw",
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  uploadResumeToCloudinary,
};
