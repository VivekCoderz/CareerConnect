const request = require("supertest");
const app = require("../../app");
const { createUserWithToken } = require("../helpers/createTestUser");

describe("daily AI quota (G09)", () => {
  const original = process.env.RATE_LIMIT_AI_DAILY_MAX;
  beforeAll(() => { process.env.RATE_LIMIT_AI_DAILY_MAX = "2"; });
  afterAll(() => {
    if (original === undefined) delete process.env.RATE_LIMIT_AI_DAILY_MAX;
    else process.env.RATE_LIMIT_AI_DAILY_MAX = original;
  });

  it("blocks a user's AI requests after the daily quota with a clear message", async () => {
    const { token } = await createUserWithToken({ email: "ai-quota@student.test" });
    const tailor = () => request(app).post("/api/resume/tailor").set("Authorization", `Bearer ${token}`).send({});

    expect((await tailor()).statusCode).not.toBe(429);
    expect((await tailor()).statusCode).not.toBe(429);
    const blocked = await tailor();

    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.code).toBe("AI_DAILY_LIMIT");
  });

  it("counts each user separately", async () => {
    const { token } = await createUserWithToken({ email: "ai-quota-2@student.test" });

    const res = await request(app).post("/api/resume/tailor").set("Authorization", `Bearer ${token}`).send({});

    expect(res.statusCode).not.toBe(429);
  });
});
