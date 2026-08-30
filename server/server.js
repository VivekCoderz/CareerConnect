require("dotenv").config();
const app = require("./app.js");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

const server = app.listen(PORT || 5000, () => {
    console.log(`CareerConnect server running on port ${PORT} 🔥`);
});
