const request = require("supertest");
const app = require("../../app");
const Job = require("../../models/Job");
const { clearSearchCache } = require("../../services/jobScraperService");

const feedJob = (externalId, title, location, workMode) => Job.create({
  title, description: "Feed listing", location, workMode, employmentType: "Full-time",
  source: "Remotive", isExternal: true, externalId, applyUrl: `https://remotive.com/${externalId}`,
  status: "Published", deadline: new Date(Date.now() + 5 * 86400000),
});

// QA (6 Oct): "Delhi NCR" listed remote roles for "Europe, USA, Canada, APAC".
describe("opportunities region filter", () => {
  beforeEach(() => clearSearchCache());

  it("a city shows local roles and remote roles open to India, not worldwide/APAC remote roles", async () => {
    await feedJob("gurgaon-1", "Backend Developer Gurugram", "Gurugram, India", "On-site");
    await feedJob("remote-india-1", "Remote React Developer India", "Remote, India", "Remote");
    await feedJob("apac-1", "Senior Data Scientist APAC", "Europe, USA, Canada, APAC", "Remote");

    const res = await request(app).get("/api/opportunities").query({ region: "Delhi NCR", limit: 50 });
    expect(res.statusCode).toBe(200);
    const titles = (res.body.data || []).map((o) => o.title);
    expect(titles).toEqual(expect.arrayContaining(["Backend Developer Gurugram", "Remote React Developer India"]));
    expect(titles).not.toContain("Senior Data Scientist APAC");

    clearSearchCache();
    const all = await request(app).get("/api/opportunities").query({ limit: 50 });
    expect((all.body.data || []).map((o) => o.title)).toContain("Senior Data Scientist APAC");
  });
});
