import api from "../api/api";

// Change email (signed in). Step 1: verify it's you with the password...
export const verifyPasswordForEmailChange = async (password) => {
  const res = await api.post("/account/email/verify-password", { password });
  return res.data;
};

// ...or with a code sent to the current email, then a new password.
export const sendOldEmailOtp = async () => {
  const res = await api.post("/account/email/send-old-otp");
  return res.data;
};

export const verifyOldEmailOtp = async (otp) => {
  const res = await api.post("/account/email/verify-old-otp", { otp });
  return res.data;
};

export const resetAccountPassword = async (resetToken, newPassword) => {
  const res = await api.post("/account/password/reset", { resetToken, newPassword });
  return res.data;
};

// Step 2: send a code to the new address. Step 3: verify it and save the new email.
export const requestNewEmail = async (changeToken, newEmail) => {
  const res = await api.post("/account/email/request-new", { changeToken, newEmail });
  return res.data;
};

export const confirmNewEmail = async (changeToken, otp) => {
  const res = await api.post("/account/email/confirm-new", { changeToken, otp });
  return res.data;
};

export default {
  verifyPasswordForEmailChange,
  sendOldEmailOtp,
  verifyOldEmailOtp,
  resetAccountPassword,
  requestNewEmail,
  confirmNewEmail,
};
