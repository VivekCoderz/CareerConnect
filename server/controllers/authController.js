// Auth controllers (H27). The handlers live in controllers/auth/; this file keeps the
// import path that routes/authRoutes.js and other controllers use.
const { userPayload, generateToken, setTokenCookie } = require("./auth/shared");

module.exports = {
  ...require("./auth/signupOtp"),
  ...require("./auth/signup"),
  ...require("./auth/login"),
  ...require("./auth/google"),
  ...require("./auth/password"),
  ...require("./auth/employerSignup"),
  ...require("./auth/googleOnboarding"),
  userPayload,
  generateToken,
  setTokenCookie,
};
