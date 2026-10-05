const request = require("supertest");
const app = require("../../app");
const { createTestJob } = require("../helpers/createTestJob");

// QA bug 5: picking "Digital Marketing" showed 0 jobs because listings store free-text
// categories such as "Marketing" or put the field in the title.
describe("jobs page category filter", () => {
  it("matches related categories and titles, and still applies search", async () => {
    await createTestJob(null, { title: "SEO Executive", category: "Marketing", status: "Published" });
    await createTestJob(null, { title: "Social Media Intern Lead", category: "General", status: "Published" });
    await createTestJob(null, { title: "Backend Engineer", category: "Software Development", status: "Published" });
    await createTestJob(null, { title: "Content Writer", category: "Marketing", status: "Draft" });

    const res = await request(app).get("/api/jobs").query({ category: "Digital Marketing" });
    expect(res.statusCode).toBe(200);
    const titles = (res.body.jobs || res.body.data || []).map((j) => j.title).sort();
    expect(titles).toEqual(["SEO Executive", "Social Media Intern Lead"]);

    const searched = await request(app).get("/api/jobs").query({ category: "Digital Marketing", search: "SEO" });
    expect((searched.body.jobs || searched.body.data || []).map((j) => j.title)).toEqual(["SEO Executive"]);
  });
});
