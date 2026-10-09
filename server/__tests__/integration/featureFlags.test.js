const request = require("supertest");
const jwt = require("jsonwebtoken");

describe("Feature flags", () => {
  let app;
  let userToken;

  beforeAll(() => {
    // Save original env vars
    const originalEnv = { ...process.env };

    // Explicitly set flags to "false" so that any internal dotenv.config() calls
    // during require won't re-inject "true" from .env
    process.env.ENABLE_COURSES = "false";
    process.env.ENABLE_PAYMENTS = "false";
    process.env.ENABLE_ASSESSMENTS = "false";

    // Load a fresh app
    jest.isolateModules(() => {
      app = require("../../app");
    });

    const secret = process.env.JWT_SECRET || "test-secret-key-careerconnect-123";
    userToken = jwt.sign({ id: "000000000000000000000001" }, secret, { expiresIn: "1h" });

    // Restore flags so they don't break subsequent test files
    process.env = originalEnv;
  });

  const routes = [
    "/api/courses",
    "/api/course-content",
    "/api/payment/x",
    "/api/employer/learning",
    "/api/assessments",
  ];

  routes.forEach((route) => {
    it(`should return 404 for GET ${route} when flags are disabled (unauthenticated)`, async () => {
      const res = await request(app).get(route);
      expect(res.statusCode).toBe(404);
    });

    it(`should return 404 for GET ${route} when flags are disabled (authenticated)`, async () => {
      const res = await request(app)
        .get(route)
        .set("Cookie", `token=${userToken}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
