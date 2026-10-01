const request = require("supertest");
const { createUserWithToken } = require("../helpers/createTestUser");

describe("Feature flags", () => {
  let app;
  let userToken;

  beforeAll(async () => {
    // Save original env vars
    const originalEnv = { ...process.env };
    
    // Delete flags
    delete process.env.ENABLE_COURSES;
    delete process.env.ENABLE_PAYMENTS;
    delete process.env.ENABLE_ASSESSMENTS;

    // Load a fresh app
    jest.isolateModules(() => {
      app = require("../../app");
    });

    // Create a test user for auth
    const user = await createUserWithToken({ email: `featureflag-${Date.now()}@example.com` });
    userToken = user.token;

    // Restore flags so they don't break other tests
    process.env = originalEnv;
  });

  const routes = [
    "/api/courses",
    "/api/course-content",
    "/api/payment/x",
    "/api/employer/learning",
    "/api/assessments"
  ];

  routes.forEach((route) => {
    it(`should return 404 for GET ${route} when flags are disabled (unauthenticated)`, async () => {
      const res = await request(app).get(route);
      expect(res.statusCode).toBe(404);
    });

    it(`should return 404 for GET ${route} when flags are disabled (authenticated)`, async () => {
      const res = await request(app).get(route).set("Cookie", `token=${userToken}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
