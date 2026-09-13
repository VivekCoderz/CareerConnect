const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const app = require("./app.js");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = app.listen(PORT || 5000, () => {
    console.log(`CareerConnect server running on port ${PORT} 🔥`);
});
