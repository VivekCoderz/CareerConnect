const request = require("supertest");
const app = require("../../app");
const Internship = require("../../models/Internship");
const Company = require("../../models/Company");
const User = require("../../models/User");
const { createTestJob } = require("../helpers/createTestJob");
const { createTestEmployer, createEmployerProfile } = require("../helpers/createTestUser");

// G02: GET /sitemap.xml lists only what a visitor can open on www.e2job.com.
const SITE = "https://www.e2job.com";
const DAY = 24 * 60 * 60 * 1000;
const internship = (overrides = {}) =>
  Internship.create({ title: "Design Intern", location: "Remote", description: "Design things.", status: "Published", ...overrides });

describe("GET /sitemap.xml (G02)", () => {
  it("lists open own listings and public companies, and nothing else", async () => {
    const future = new Date(Date.now() + 10 * DAY);
    const past = new Date(Date.now() - 10 * DAY);

    const openJob = await createTestJob(null, { title: "Open job", deadline: future });
    const noDeadlineJob = await createTestJob(null, { title: "No deadline job" });
    const draftJob = await createTestJob(null, { title: "Draft job", status: "Draft" });
    const pendingJob = await createTestJob(null, { title: "Pending job", status: "Pending Approval" });
    const expiredJob = await createTestJob(null, { title: "Expired job", deadline: past });
    const externalJob = await createTestJob(null, { title: "External job", isExternal: true, source: "Remotive" });

    const openInternship = await internship({ deadline: future });
    const draftInternship = await internship({ status: "Draft" });
    const expiredInternship = await internship({ deadline: past });
    const externalInternship = await internship({ isExternal: true });

    const approvedOwner = await createTestEmployer({ email: "sitemap-approved@example.com" });
    const approved = await createEmployerProfile(approvedOwner._id, { isPublished: true });
    const pendingOwner = await createTestEmployer({ email: "sitemap-pending@example.com" });
    const pending = await createEmployerProfile(pendingOwner._id, { isPublished: true, verificationStatus: "pending" });
    const hiddenOwner = await createTestEmployer({ email: "sitemap-hidden@example.com" });
    const unpublished = await createEmployerProfile(hiddenOwner._id, { isPublished: false });
    const inactiveCompany = await Company.create({ name: "Closed Co", status: "inactive" });
    const inactiveOwner = await createTestEmployer({ email: "sitemap-inactive@example.com" });
    await User.updateOne({ _id: inactiveOwner._id }, { companyId: inactiveCompany._id });
    const inactive = await createEmployerProfile(inactiveOwner._id, { isPublished: true });

    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    const xml = res.text;
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    const has = (path) => xml.includes(`<loc>${SITE}${path}</loc>`);
    for (const path of ["/", "/jobs", "/internships", "/privacy", "/terms", "/contact"]) {
      expect(has(path)).toBe(true);
    }
    expect(has(`/jobs/${openJob._id}`)).toBe(true);
    expect(has(`/jobs/${noDeadlineJob._id}`)).toBe(true);
    expect(has(`/internships/${openInternship._id}`)).toBe(true);
    expect(has(`/companies/${approved._id}`)).toBe(true);

    for (const job of [draftJob, pendingJob, expiredJob, externalJob]) expect(has(`/jobs/${job._id}`)).toBe(false);
    for (const item of [draftInternship, expiredInternship, externalInternship]) expect(has(`/internships/${item._id}`)).toBe(false);
    for (const profile of [pending, unpublished, inactive]) expect(has(`/companies/${profile._id}`)).toBe(false);

    expect(xml).not.toContain("codeformode");
    expect(res.headers["cache-control"]).toMatch(/max-age=3600/);
  });

  it("is public and returns the static pages on an empty database", async () => {
    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect((res.text.match(/<url>/g) || []).length).toBe(6);
  });
});
