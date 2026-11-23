// H19: recommendations are built once per user and reused for 10 minutes; filters work on
// the cached result. A profile change, a new application or expiry rebuilds them.
const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const RecommendationCache = require("../../models/RecommendationCache");
const recommendationEngine = require("../../services/recommendationEngine");
const { createUserWithToken, createTestEmployer, createEmployerProfile } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const auth = (identity) => ({ Cookie: `token=${identity.token}` });

describe("recommendation cache (H19)", () => {
  let fresher;
  let engine;

  const get = (path) => request(app).get(path).set(auth(fresher));

  beforeEach(async () => {
    fresher = await createUserWithToken({ email: `h19-${Date.now()}@example.com`, userType: "fresher" });
    engine = jest.spyOn(recommendationEngine, "generateFresherRecommendations");
  });

  afterEach(() => engine.mockRestore());

  it("runs the engine once for repeated requests and filter changes within 10 minutes", async () => {
    expect((await get("/api/recommendations/jobs")).status).toBe(200);
    expect((await get("/api/recommendations/jobs?workMode=Remote")).status).toBe(200);
    expect((await get("/api/recommendations/jobs?location=Pune&search=react")).status).toBe(200);
    expect((await get("/api/recommendations/skills")).status).toBe(200);
    const overview = await get("/api/recommendations");

    expect(overview.status).toBe(200);
    expect(engine).toHaveBeenCalledTimes(1);
    const entry = await RecommendationCache.findOne({ userId: fresher.user._id }).lean();
    expect(new Date(overview.body.generatedAt).getTime()).toBe(entry.generatedAt.getTime());
  });

  it("rebuilds after the fresher profile is updated", async () => {
    await get("/api/recommendations/jobs");
    const update = await request(app)
      .patch("/api/fresher/profile")
      .set(auth(fresher))
      .send({ careerObjective: "Backend developer working with Node.js" });
    expect(update.status).toBe(200);

    await get("/api/recommendations/jobs");
    expect(engine).toHaveBeenCalledTimes(2);
  });

  it("rebuilds after the candidate applies, since applied listings are left out", async () => {
    await get("/api/recommendations/jobs");
    const employer = await createTestEmployer({ email: `h19-employer-${Date.now()}@example.com` });
    const profile = await createEmployerProfile(employer._id, { companyName: "Acme Tech" });
    const job = await createTestJob(profile._id, { createdBy: employer._id });
    await Application.create({
      candidateId: fresher.user._id, jobId: job._id, employerId: profile._id,
      opportunityType: "Job", opportunityTitle: job.title, companyName: "Acme Tech",
    });
    expect(await RecommendationCache.countDocuments({ userId: fresher.user._id })).toBe(0);

    await get("/api/recommendations/jobs");
    expect(engine).toHaveBeenCalledTimes(2);
  });

  it("rebuilds once the entry is older than 10 minutes", async () => {
    await get("/api/recommendations/jobs");
    await RecommendationCache.updateOne({ userId: fresher.user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await get("/api/recommendations/jobs");
    expect(engine).toHaveBeenCalledTimes(2);
  });

  it("keeps each user's entry separate", async () => {
    const other = await createUserWithToken({ email: `h19-other-${Date.now()}@example.com`, userType: "fresher" });
    await get("/api/recommendations/jobs");
    await request(app).get("/api/recommendations/jobs").set(auth(other));

    expect(engine).toHaveBeenCalledTimes(2);
    expect(await RecommendationCache.countDocuments()).toBe(2);
  });

  it("deletes the entry with the account", async () => {
    await get("/api/recommendations/jobs");
    const res = await request(app).delete("/api/auth/account").set(auth(fresher)).send({ password: "Password@123" });
    expect(res.status).toBe(200);
    expect(await RecommendationCache.countDocuments({ userId: fresher.user._id })).toBe(0);
  });
});
