const request = require("supertest");
const app = require("../../app");
const { createTestJob: createJob } = require("../helpers/createTestJob");

// C5 / FL-04: Explore Jobs filters. The page sends search, city, category, workMode,
// sort, page and limit; every active filter must apply together, and only to jobs
// candidates may see (Published, deadline not passed, not an internship).
const titlesOf = (res) => (res.body.jobs || []).map((j) => j.title).sort();
const list = (query) => request(app).get("/api/jobs").query(query);

describe("jobs page filters (C5 / FL-04)", () => {
  beforeEach(async () => {
    // The helper's default description mentions "React developer"; give each job its own.
    const createTestJob = (employerId, overrides) =>
      createJob(employerId, { description: `${overrides.title} role at Test Corp.`, ...overrides });
    await createTestJob(null, { title: "React Developer", city: "Bengaluru", location: "Bengaluru, Karnataka", workMode: "On-site", category: "Web Development" });
    await createTestJob(null, { title: "Data Analyst", city: "New Delhi", location: "New Delhi, Delhi", workMode: "Hybrid", category: "Data Science", requiredSkills: ["SQL"] });
    await createTestJob(null, { title: "Backend Engineer", city: "Gurugram", location: "Gurugram, Haryana", workMode: "On-site", category: "Software Development", requiredSkills: ["Node.js"] });
    await createTestJob(null, { title: "Remote Frontend Engineer", city: "", location: "Remote", workMode: "Remote", category: "Web Development", requiredSkills: ["Vue"] });
    await createTestJob(null, { title: "Pune DevOps Engineer", city: "Pune", location: "Pune, Maharashtra", workMode: "Hybrid", category: "DevOps & Cloud", requiredSkills: ["AWS"] });

    // Never visible to candidates, whatever the filters.
    await createTestJob(null, { title: "Draft React Developer", city: "Bengaluru", workMode: "On-site", status: "Draft" });
    await createTestJob(null, { title: "Pending React Developer", city: "Bengaluru", workMode: "On-site", status: "Pending Approval" });
    await createTestJob(null, { title: "Rejected React Developer", city: "Bengaluru", workMode: "On-site", status: "Rejected" });
    await createTestJob(null, { title: "Expired React Developer", city: "Bengaluru", workMode: "On-site", deadline: new Date("2020-01-01") });
    await createTestJob(null, { title: "React Intern", city: "Bengaluru", workMode: "On-site", employmentType: "Internship" });
  });

  it("lists every eligible job when no filter is set", async () => {
    const res = await list({ sort: "latest", page: 1, limit: 10 });
    expect(res.statusCode).toBe(200);
    expect(titlesOf(res)).toEqual([
      "Backend Engineer", "Data Analyst", "Pune DevOps Engineer", "React Developer", "Remote Frontend Engineer",
    ]);
    expect(res.body.pagination).toMatchObject({ total: 5, page: 1, limit: 10, totalPages: 1 });
  });

  it("matches the On-Site work mode the page sends to the stored On-site value", async () => {
    const res = await list({ workMode: "On-Site" });
    expect(res.statusCode).toBe(200);
    expect(titlesOf(res)).toEqual(["Backend Engineer", "React Developer"]);
  });

  it("matches Remote and Hybrid work modes", async () => {
    expect(titlesOf(await list({ workMode: "Remote" }))).toEqual(["Remote Frontend Engineer"]);
    expect(titlesOf(await list({ workMode: "Hybrid" }))).toEqual(["Data Analyst", "Pune DevOps Engineer"]);
  });

  it("matches the page's city labels to the spellings listings use", async () => {
    expect(titlesOf(await list({ city: "Delhi NCR" }))).toEqual(["Backend Engineer", "Data Analyst"]);
    expect(titlesOf(await list({ city: "Bangalore" }))).toEqual(["React Developer"]);
    expect(titlesOf(await list({ city: "Pune" }))).toEqual(["Pune DevOps Engineer"]);
    expect(titlesOf(await list({ city: "Remote" }))).toEqual(["Remote Frontend Engineer"]);
  });

  it("applies keyword search", async () => {
    expect(titlesOf(await list({ search: "react" }))).toEqual(["React Developer"]);
    expect(titlesOf(await list({ search: "SQL" }))).toEqual(["Data Analyst"]);
    // Partial words fall back to the substring match.
    expect(titlesOf(await list({ search: "devel" }))).toEqual(["React Developer"]);
  });

  it("applies every active filter together", async () => {
    expect(titlesOf(await list({ city: "Delhi NCR", workMode: "On-Site" }))).toEqual(["Backend Engineer"]);
    expect(titlesOf(await list({ city: "Delhi NCR", category: "Data Science" }))).toEqual(["Data Analyst"]);
    expect(titlesOf(await list({ city: "Delhi NCR", category: "Software Development", workMode: "On-Site", search: "engineer" })))
      .toEqual(["Backend Engineer"]);
    // Changing one filter keeps the others applied.
    expect(titlesOf(await list({ city: "Delhi NCR", workMode: "Hybrid" }))).toEqual(["Data Analyst"]);
  });

  it("returns an empty page, not an error, when nothing matches", async () => {
    const res = await list({ search: "zzz-no-such-job", city: "Chennai" });
    expect(res.statusCode).toBe(200);
    expect(res.body.jobs).toEqual([]);
    expect(res.body.pagination).toMatchObject({ total: 0, totalPages: 1 });
  });

  it("pages through filtered results with matching totals", async () => {
    const first = await list({ workMode: "On-Site", limit: 1, page: 1 });
    const second = await list({ workMode: "On-Site", limit: 1, page: 2 });
    expect(first.body.pagination).toMatchObject({ total: 2, totalPages: 2, page: 1 });
    expect(second.body.pagination).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect([...titlesOf(first), ...titlesOf(second)].sort()).toEqual(["Backend Engineer", "React Developer"]);
  });

  it("never shows unpublished, expired or internship listings through any filter", async () => {
    const hidden = /Draft|Pending|Rejected|Expired|Intern\b/;
    for (const query of [{}, { city: "Bangalore" }, { workMode: "On-Site" }, { search: "react" }, { city: "Bangalore", workMode: "On-Site", search: "react" }]) {
      const res = await list(query);
      expect(titlesOf(res).filter((t) => hidden.test(t))).toEqual([]);
    }
  });

  it("treats regex characters and operator objects as plain values", async () => {
    const regexy = await list({ search: "(", city: "[", workMode: ".*" });
    expect(regexy.statusCode).toBe(200);
    expect(regexy.body.jobs).toEqual([]);

    // Operator objects are ignored rather than passed to Mongo, so this is the unfiltered list.
    const injected = await request(app).get("/api/jobs?workMode[$ne]=Remote&city[$ne]=x");
    expect(injected.statusCode).toBe(200);
    expect(titlesOf(injected)).toEqual(titlesOf(await list({})));
    expect(injected.body.pagination.total).toBe(5);
  });
});
