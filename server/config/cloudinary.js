require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
    const cleanName = originalName
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/\.[^/.]+$/, "");
    const publicId = `resume_${userId}_${cleanName}_${Date.now()}.pdf`;

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
