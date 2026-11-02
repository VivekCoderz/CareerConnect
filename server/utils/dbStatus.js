const mongoose = require("mongoose");

// True when Mongoose has an open connection (readyState 1).
const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = { isDatabaseConnected };
