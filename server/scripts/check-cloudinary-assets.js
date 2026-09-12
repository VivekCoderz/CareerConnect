require("dotenv").config({ path: "./.env" });
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.Cloudinary_Cloud_Name,
  api_key: process.env.Cloudinary_API_Key,
  api_secret: process.env.Cloudinary_API_Secret,
});

async function checkCloudinaryResources() {
  try {
    console.log("=========================================");
    console.log("Checking Cloudinary Cloud:", process.env.Cloudinary_Cloud_Name);
    console.log("=========================================");
    
    // 1. Check Video Resources
    const videoRes = await cloudinary.api.resources({
      resource_type: "video",
      max_results: 50,
    });
    console.log("\n🎥 VIDEOS IN CLOUDINARY:");
    console.log("Total Videos found:", videoRes.resources.length);
    if (videoRes.resources.length > 0) {
      videoRes.resources.forEach((res, i) => {
        console.log(`\n  [Video ${i + 1}]`);
        console.log(`  - Public ID: ${res.public_id}`);
        console.log(`  - Format: ${res.format}`);
        console.log(`  - Duration: ${res.duration ? res.duration + 's' : 'N/A'}`);
        console.log(`  - Created At: ${res.created_at}`);
        console.log(`  - Direct URL: ${res.secure_url}`);
      });
    } else {
      console.log("  -> No videos uploaded yet in this Cloudinary account.");
    }

    // 2. Check Image Resources
    const imageRes = await cloudinary.api.resources({
      resource_type: "image",
      max_results: 50,
    });
    console.log("\n🖼️ IMAGES IN CLOUDINARY:");
    console.log("Total Images found:", imageRes.resources.length);
    if (imageRes.resources.length > 0) {
      imageRes.resources.forEach((res, i) => {
        console.log(`\n  [Image ${i + 1}]`);
        console.log(`  - Public ID: ${res.public_id}`);
        console.log(`  - Format: ${res.format}`);
        console.log(`  - Created At: ${res.created_at}`);
        console.log(`  - Direct URL: ${res.secure_url}`);
      });
    }

    // 3. Check Raw (PDFs/docs) Resources
    const rawRes = await cloudinary.api.resources({
      resource_type: "raw",
      max_results: 50,
    });
    console.log("\n📄 DOCUMENTS / RAWS IN CLOUDINARY:");
    console.log("Total Raw Files found:", rawRes.resources.length);
    if (rawRes.resources.length > 0) {
      rawRes.resources.forEach((res, i) => {
        console.log(`\n  [Doc ${i + 1}] Public ID: ${res.public_id} | URL: ${res.secure_url}`);
      });
    }

    console.log("\n=========================================");
  } catch (err) {
    console.error("Cloudinary API Query Error:", err.message);
  }
}

checkCloudinaryResources();
