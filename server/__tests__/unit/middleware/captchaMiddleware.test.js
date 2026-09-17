const axios = require("axios");
const verifyCaptcha = require("../../../middleware/captchaMiddleware");

jest.mock("axios");

describe("production CAPTCHA verification", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    process.env.CLIENT_URL = "https://careerconnect.example.com";
    axios.post.mockReset();
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  const response = () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    return res;
  };

  it("rejects forged browser tokens and missing tokens", async () => {
    const middleware = verifyCaptcha("login");
    const next = jest.fn();
    const missingRes = response();
    await middleware({ body: {}, ip: "127.0.0.1" }, missingRes, next);
    expect(missingRes.status).toHaveBeenCalledWith(403);

    axios.post.mockResolvedValueOnce({ data: { success: false } });
    const forgedRes = response();
    await middleware({ body: { captchaToken: "human_verified_fake" }, ip: "127.0.0.1" }, forgedRes, next);
    expect(forgedRes.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("requires the expected action, hostname and score", async () => {
    const middleware = verifyCaptcha("login");
    const next = jest.fn();
    axios.post.mockResolvedValueOnce({ data: {
      success: true, score: 0.9, action: "signup", hostname: "careerconnect.example.com",
    } });
    const wrongAction = response();
    await middleware({ body: { captchaToken: "valid-token" }, ip: "127.0.0.1" }, wrongAction, next);
    expect(wrongAction.status).toHaveBeenCalledWith(403);

    axios.post.mockResolvedValueOnce({ data: {
      success: true, score: 0.9, action: "login", hostname: "careerconnect.example.com",
    } });
    const valid = response();
    await middleware({ body: { captchaToken: "valid-token" }, ip: "127.0.0.1" }, valid, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
