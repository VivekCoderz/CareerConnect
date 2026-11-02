const axios = require("axios");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const Job = require("../../models/Job");
const Internship = require("../../models/Internship");
const {
  normalizeFeedJob,
  runExternalJobSync,
  deleteOldClosedFeedListings,
  runScheduledSyncIfDue,
  startExternalJobSyncSchedule,
  getSyncIntervalMs,
} = require("../../services/externalJobSync");
const { clearSearchCache } = require("../../services/jobScraperService");
const { createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const DAY_MS = 24 * 60 * 60 * 1000;
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

const remotiveJob = (overrides = {}) => ({
  id: 1001,
  url: "https://remotive.com/remote-jobs/software-dev/backend-engineer-1001",
  title: "Backend Engineer",
  company_name: "Remote Co",
  category: "Software Development",
  tags: ["node", "mongodb"],
  job_type: "full_time",
  publication_date: new Date(Date.now() - 2 * DAY_MS).toISOString(),
  candidate_required_location: "India",
  description: "<p>Build <b>APIs</b></p>",
  ...overrides,
});

const remotiveFeed = () => ({
  jobs: [
    remotiveJob(),
    remotiveJob({ id: 1002, title: "Frontend Intern", job_type: "internship", url: "https://remotive.com/remote-jobs/1002" }),
    remotiveJob({ id: 1003, title: "" }), // invalid: no title
    remotiveJob({ id: 1004, title: "Bad Link", url: "javascript:alert(1)" }), // invalid: not http(s)
  ],
});

const arbeitnowFeed = () => ({
  data: [
    {
      slug: "data-analyst-bengaluru-123",
      company_name: "Data GmbH",
      title: "Data Analyst",
      description: "<p>SQL dashboards</p>",
      remote: false,
      url: "https://www.arbeitnow.com/jobs/companies/data-gmbh/data-analyst-bengaluru-123",
      tags: ["SQL"],
      job_types: ["full time"],
      location: "Bengaluru, India",
      created_at: Math.floor((Date.now() - DAY_MS) / 1000),
    },
  ],
  links: { next: null },
});

/** Mocks axios.get with the two approved feeds; any other URL fails the test. */
const mockFeeds = ({ remotive = remotiveFeed, arbeitnow = arbeitnowFeed } = {}) =>
  jest.spyOn(axios, "get").mockImplementation(async (url) => {
    if (url === "https://remotive.com/api/remote-jobs") return { data: remotive() };
    if (url === "https://www.arbeitnow.com/api/job-board-api") return { data: arbeitnow() };
    throw new Error(`unexpected URL ${url}`);
  });

describe("I04 scheduled external job feed sync", () => {
  beforeAll(async () => {
    await Promise.all([Job.init(), Internship.init()]);
  });

  beforeEach(() => clearSearchCache());
  afterEach(() => jest.restoreAllMocks());

  describe("normalisation", () => {
    it("maps a Remotive posting to Job fields with source, attribution and expiry", () => {
      const now = new Date("2026-10-03T10:00:00Z");
      const { isInternship, fields, error } = normalizeFeedJob("Remotive", remotiveJob(), now);

      expect(error).toBeUndefined();
      expect(isInternship).toBe(false);
      expect(fields).toMatchObject({
        source: "Remotive",
        externalId: "1001",
        isExternal: true,
        attribution: "Job listing from Remotive (remotive.com)",
        title: "Backend Engineer",
        companyName: "Remote Co",
        description: "Build APIs",
        employmentType: "Full-time",
        workMode: "Remote",
        country: "India",
        isInternational: false,
        requiredSkills: ["node", "mongodb"],
        applyUrl: "https://remotive.com/remote-jobs/software-dev/backend-engineer-1001",
      });
      expect(fields.lastSyncedAt).toEqual(now);
      expect(fields.deadline).toEqual(new Date(now.getTime() + 3 * DAY_MS));
    });

    it("classifies internships and rejects malformed or unapproved records", () => {
      expect(normalizeFeedJob("Remotive", remotiveJob({ job_type: "internship" })).isInternship).toBe(true);
      expect(normalizeFeedJob("Remotive", remotiveJob({ id: null })).error).toMatch(/externalId/);
      expect(normalizeFeedJob("Remotive", remotiveJob({ title: "  " })).error).toMatch(/title/);
      expect(normalizeFeedJob("Remotive", remotiveJob({ url: "ftp://x" })).error).toMatch(/applyUrl/);
      expect(normalizeFeedJob("Remotive", null).error).toMatch(/malformed/);
      expect(normalizeFeedJob("LinkedIn", remotiveJob()).error).toMatch(/unapproved/);
    });

    it("FL-03: only whole-word intern/internship makes an internship; trainee roles stay jobs", () => {
      const classify = (overrides) => normalizeFeedJob("Remotive", remotiveJob(overrides));
      expect(classify({ title: "Internal Audit Manager" }).isInternship).toBe(false);
      expect(classify({ title: "International Sales Executive" }).isInternship).toBe(false);
      const trainee = classify({ title: "Graduate Trainee - Operations" });
      expect(trainee.isInternship).toBe(false);
      expect(trainee.fields.employmentType).toBe("Trainee");
      expect(classify({ title: "Marketing Interns (Summer)" }).isInternship).toBe(true);
      expect(classify({ title: "Marketing Assistant", job_type: "internship" }).isInternship).toBe(true);
    });
  });

  describe("sync", () => {
    it("fetches only the approved feeds and stores jobs and internships", async () => {
      const get = mockFeeds();

      const result = await runExternalJobSync();

      expect(get.mock.calls.map(([url]) => url).sort()).toEqual([
        "https://remotive.com/api/remote-jobs",
        "https://www.arbeitnow.com/api/job-board-api",
      ]);
      expect(result).toMatchObject({ fetched: 5, inserted: 3, updated: 0, invalid: 2, failed: 0 });
      expect(result.sources.Remotive.error).toBeNull();

      const job = await Job.findOne({ source: "Remotive", externalId: "1001" }).lean();
      expect(job).toMatchObject({
        status: "Published",
        isExternal: true,
        attribution: "Job listing from Remotive (remotive.com)",
        employerId: null,
      });
      expect(job.deadline.getTime()).toBeGreaterThan(Date.now());
      expect(job.lastSyncedAt).toBeInstanceOf(Date);

      const internship = await Internship.findOne({ source: "Remotive", externalId: "1002" }).lean();
      expect(internship).toMatchObject({ title: "Frontend Intern", isExternal: true, status: "Published" });
      expect(await Job.countDocuments({ source: "Arbeitnow", externalId: "data-analyst-bengaluru-123" })).toBe(1);
    });

    it("keeps only postings open to candidates in India and closes old ones that aren't", async () => {
      const stale = await Job.create({
        title: "Old Zurich role", description: "x", location: "Zurich", source: "Remotive",
        isExternal: true, externalId: "old-zurich", status: "Published",
      });
      mockFeeds({
        remotive: () => ({
          jobs: [
            remotiveJob({ id: 2001, candidate_required_location: "Worldwide" }),
            remotiveJob({ id: 2002, candidate_required_location: "USA Only" }),
            remotiveJob({ id: 2003, candidate_required_location: "APAC" }),
          ],
        }),
        arbeitnow: () => ({ data: [{ ...arbeitnowFeed().data[0], slug: "zug-1", location: "Zug", remote: true }], links: { next: null } }),
      });

      const result = await runExternalJobSync();

      expect(result).toMatchObject({ inserted: 2, skipped: 2 });
      expect(await Job.exists({ externalId: "2001" })).toBeTruthy();
      expect(await Job.exists({ externalId: "2003" })).toBeTruthy();
      expect(await Job.exists({ externalId: "2002" })).toBeNull();
      expect(await Job.exists({ externalId: "zug-1" })).toBeNull();
      expect((await Job.findById(stale._id).lean()).status).toBe("Closed");
    });

    it("running twice updates the same records instead of duplicating them", async () => {
      mockFeeds();
      await runExternalJobSync();
      const firstId = (await Job.findOne({ externalId: "1001" }).lean())._id;

      const second = await runExternalJobSync();

      expect(second).toMatchObject({ inserted: 0, updated: 3 });
      expect(await Job.countDocuments({ isExternal: true })).toBe(2);
      expect(await Internship.countDocuments({ isExternal: true })).toBe(1);
      expect((await Job.findOne({ externalId: "1001" }).lean())._id).toEqual(firstId);
    });

    it("shares one run between concurrent calls", async () => {
      const get = mockFeeds();

      const [a, b] = await Promise.all([runExternalJobSync(), runExternalJobSync()]);

      expect(a).toBe(b);
      expect(get).toHaveBeenCalledTimes(2);
      expect(await Job.countDocuments({ isExternal: true })).toBe(2);
    });

    it("reports a failed feed without stopping the other feed", async () => {
      jest.spyOn(axios, "get").mockImplementation(async (url) => {
        if (url.includes("remotive")) {
          const err = new Error("Request failed with status code 429");
          err.response = { status: 429 };
          throw err;
        }
        return { data: arbeitnowFeed() };
      });

      const result = await runExternalJobSync();

      expect(result.sources.Remotive.error).toBe("rate limited (HTTP 429)");
      expect(result.sources.Arbeitnow).toMatchObject({ error: null, inserted: 1 });
    });

    it("treats a response without the expected list as a feed error", async () => {
      mockFeeds({ remotive: () => ({ unexpected: true }) });

      const result = await runExternalJobSync();

      expect(result.sources.Remotive.error).toMatch(/invalid feed response/);
      expect(await Job.countDocuments({ source: "Remotive" })).toBe(0);
    });
  });

  describe("expiry", () => {
    it("stores postings older than the maximum age as already expired, so lists hide them", async () => {
      mockFeeds({
        remotive: () => ({
          jobs: [remotiveJob({ publication_date: new Date(Date.now() - 90 * DAY_MS).toISOString() })],
        }),
      });
      await runExternalJobSync();

      const stored = await Job.findOne({ externalId: "1001" }).lean();
      expect(stored.deadline.getTime()).toBeLessThan(Date.now());
      const res = await request(app).get("/api/jobs?source=external");
      expect(res.body.jobs.map((j) => j.title)).not.toContain("Backend Engineer");
    });

    it("reopens a listing the expiry sweep closed when the feed shows it again", async () => {
      mockFeeds();
      await runExternalJobSync();
      await Job.updateOne({ externalId: "1001" }, { status: "Closed", closedReason: "expired", closedAt: new Date() });

      await runExternalJobSync();

      expect((await Job.findOne({ externalId: "1001" }).lean())).toMatchObject({ status: "Published", closedReason: null });
    });

    it("keeps a listing an admin rejected rejected", async () => {
      mockFeeds();
      await runExternalJobSync();
      await Job.updateOne({ externalId: "1001" }, { status: "Rejected" });

      await runExternalJobSync();

      expect((await Job.findOne({ externalId: "1001" }).lean()).status).toBe("Rejected");
    });
  });

  describe("cleanup of old closed feed listings", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    const daysAgo = (days) => new Date(now.getTime() - days * DAY_MS);
    const closed = (days, closedReason = "expired") => ({ status: "Closed", closedReason, closedAt: daysAgo(days) });
    const external = (externalId) => ({ isExternal: true, source: "Remotive", externalId });

    const createInternship = (overrides) =>
      Internship.create({
        title: "Test Internship",
        location: "Remote",
        description: "Internship description",
        source: "CareerConnect",
        ...overrides,
      });

    /** One listing per case for the given model; returns their ids by case name. */
    const seed = async (create) => {
      const docs = {
        active: await create({ ...external("active"), status: "Published" }),
        closed13: await create({ ...external("closed13"), ...closed(13) }),
        closed15: await create({ ...external("closed15"), ...closed(15) }),
        company15: await create({ ...closed(15) }),
        adminClosed15: await create({ ...external("adminClosed15"), ...closed(15, null) }),
        rejected15: await create({ ...external("rejected15"), ...closed(15, "employer_rejected") }),
      };
      return Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, d._id]));
    };

    it.each([
      ["Job", Job, (o) => createTestJob(null, { title: "Cleanup Job", ...o })],
      ["Internship", Internship, createInternship],
    ])("deletes only %s feed listings closed as expired more than 14 days ago", async (_name, Model, create) => {
      const ids = await seed(create);

      const result = await deleteOldClosedFeedListings({ now });

      const remaining = new Set((await Model.find({}).select("_id").lean()).map((d) => String(d._id)));
      expect(remaining.has(String(ids.closed15))).toBe(false);
      for (const kept of ["active", "closed13", "company15", "adminClosed15", "rejected15"]) {
        expect(remaining.has(String(ids[kept]))).toBe(true);
      }
      expect(result.jobs + result.internships).toBe(1);
    });

    it("is idempotent: a second run deletes nothing", async () => {
      await seed((o) => createTestJob(null, { title: "Cleanup Job", ...o }));
      await seed(createInternship);

      expect(await deleteOldClosedFeedListings({ now })).toEqual({ jobs: 1, internships: 1 });
      expect(await deleteOldClosedFeedListings({ now })).toEqual({ jobs: 0, internships: 0 });
    });

    it("runs as part of the sync and a cleanup failure does not fail the sync", async () => {
      mockFeeds();
      // The sync uses the real clock, so closedAt is relative to Date.now() here.
      await createTestJob(null, {
        title: "Old Feed Job",
        ...external("old"),
        ...closed(0),
        closedAt: new Date(Date.now() - 30 * DAY_MS),
      });

      const ok = await runExternalJobSync();
      expect(ok.cleanup).toEqual({ jobs: 1, internships: 0 });
      expect(await Job.countDocuments({ externalId: "old" })).toBe(0);

      jest.spyOn(Job, "deleteMany").mockRejectedValueOnce(new Error("db down"));
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      const failed = await runExternalJobSync();
      expect(failed).toMatchObject({ cleanup: null, updated: 3 });
      expect(error).toHaveBeenCalledWith("[job-sync] I04 cleanup failed:", "db down");
    });
  });

  describe("job lists read MongoDB only", () => {
    it("never calls an external site while serving job and internship lists", async () => {
      await createTestJob(null, { title: "Campus Role" });
      const get = jest.spyOn(axios, "get");
      const req = jest.spyOn(axios, "request");

      const responses = await Promise.all([
        request(app).get("/api/jobs"),
        request(app).get("/api/internships"),
        request(app).get("/api/internships/live"),
        request(app).get("/api/opportunities"),
      ]);

      responses.forEach((res) => expect(res.statusCode).toBe(200));
      expect(get).not.toHaveBeenCalled();
      expect(req).not.toHaveBeenCalled();
      expect(responses[0].body.jobs.map((j) => j.title)).toContain("Campus Role");
    });

    it("serves synced listings from MongoDB with stable ids and attribution", async () => {
      mockFeeds();
      await runExternalJobSync();
      jest.restoreAllMocks();
      const get = jest.spyOn(axios, "get");
      clearSearchCache();

      const jobs = await request(app).get("/api/jobs?source=external");
      const internships = await request(app).get("/api/internships?source=external");

      const backend = jobs.body.jobs.find((j) => j.title === "Backend Engineer");
      expect(backend).toMatchObject({ isExternal: true, source: "Remotive", attribution: "Job listing from Remotive (remotive.com)" });
      const stored = await Internship.findOne({ externalId: "1002" }).lean();
      const intern = internships.body.internships.find((i) => i.title === "Frontend Intern");
      expect(String(intern._id)).toBe(String(stored._id));
      expect(intern.attribution).toBe("Job listing from Remotive (remotive.com)");
      expect(get).not.toHaveBeenCalled();
    });

    it("FL-03: internship lists show only internships, not full-time or trainee jobs", async () => {
      mockFeeds({
        remotive: () => ({
          jobs: [
            remotiveJob({ id: 2001, title: "International Sales Executive", url: "https://remotive.com/remote-jobs/2001" }),
            remotiveJob({ id: 2002, title: "Graduate Trainee - Operations", url: "https://remotive.com/remote-jobs/2002" }),
            remotiveJob({ id: 2003, title: "Frontend Intern", job_type: "internship", url: "https://remotive.com/remote-jobs/2003" }),
          ],
        }),
        arbeitnow: () => ({ data: [], links: { next: null } }),
      });
      await runExternalJobSync();
      jest.restoreAllMocks();
      // Stored as an internship by the older substring rule, before the next sync re-files it.
      await Internship.create({
        title: "Internal Audit Manager", location: "Remote", description: "Audit", source: "Remotive",
        isExternal: true, externalId: "legacy-1", status: "Published", applyUrl: "https://remotive.com/remote-jobs/legacy-1",
      });
      clearSearchCache();
      const student = await createUserWithToken({ email: "fl03-student@example.com" });

      const list = await request(app).get("/api/internships?source=external");
      const dash = await request(app).get("/api/student/dashboard").set(auth(student));
      const jobs = await request(app).get("/api/jobs?source=external");

      const listed = list.body.internships.map((i) => i.title);      expect(listed).toContain("Frontend Intern");
      for (const title of ["International Sales Executive", "Graduate Trainee - Operations", "Internal Audit Manager"]) {
        expect(listed).not.toContain(title);
        expect(dash.body.data.recommendedInternships.map((i) => i.title)).not.toContain(title);
      }
      expect(jobs.body.jobs.map((j) => j.title)).toEqual(
        expect.arrayContaining(["International Sales Executive", "Graduate Trainee - Operations"])
      );
    });

    it("still serves the job list when every feed is down", async () => {
      jest.spyOn(axios, "get").mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
      await createTestJob(null, { title: "Campus Role" });

      const result = await runExternalJobSync();
      const res = await request(app).get("/api/jobs");

      expect(result.sources.Remotive.error).toMatch(/ENOTFOUND/);
      expect(res.statusCode).toBe(200);
      expect(res.body.jobs.map((j) => j.title)).toContain("Campus Role");
    });
  });

  describe("schedule", () => {
    afterEach(() => {
      delete process.env.ENABLE_EXTERNAL_JOB_SYNC;
      delete process.env.EXTERNAL_JOB_SYNC_INTERVAL_HOURS;
    });

    it("syncs the approved feeds when no sync has run yet", async () => {
      const get = mockFeeds();

      const result = await runScheduledSyncIfDue();

      expect(result).toMatchObject({ inserted: 3 });
      expect(new Set(get.mock.calls.map(([url]) => url))).toEqual(
        new Set(["https://remotive.com/api/remote-jobs", "https://www.arbeitnow.com/api/job-board-api"])
      );
    });

    it("skips a run until the interval has passed since the last sync", async () => {
      const get = mockFeeds();
      await runScheduledSyncIfDue();
      get.mockClear();

      expect(await runScheduledSyncIfDue()).toBeNull();
      expect(get).not.toHaveBeenCalled();

      // Last sync 7 hours ago with the default 6-hour interval: due again.
      await Job.updateMany({ isExternal: true }, { lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) });
      await Internship.updateMany({ isExternal: true }, { lastSyncedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) });
      expect(await runScheduledSyncIfDue()).toMatchObject({ inserted: 0, updated: 3 });
      expect(get).toHaveBeenCalled();
    });

    it("reads the interval from EXTERNAL_JOB_SYNC_INTERVAL_HOURS and can be turned off", () => {
      expect(getSyncIntervalMs()).toBe(6 * 60 * 60 * 1000);
      process.env.EXTERNAL_JOB_SYNC_INTERVAL_HOURS = "12";
      expect(getSyncIntervalMs()).toBe(12 * 60 * 60 * 1000);
      process.env.EXTERNAL_JOB_SYNC_INTERVAL_HOURS = "0"; // below the 1-hour floor: default
      expect(getSyncIntervalMs()).toBe(6 * 60 * 60 * 1000);

      process.env.ENABLE_EXTERNAL_JOB_SYNC = "false";
      expect(startExternalJobSyncSchedule()).toBeNull();
    });

    it("unrefs both schedule timers so they don't keep the process alive", () => {
      const timeout = jest.spyOn(global, "setTimeout");
      const interval = startExternalJobSyncSchedule();
      const first = timeout.mock.results[timeout.mock.calls.findIndex(([fn]) => fn === runScheduledSyncIfDue)].value;
      try {
        expect(interval.hasRef()).toBe(false);
        expect(first.hasRef()).toBe(false);
      } finally {
        clearInterval(interval);
        clearTimeout(first);
      }
    });
  });

  describe("stable ids outside the job list", () => {
    it("dashboards return each synced listing once, under its stored MongoDB id", async () => {
      mockFeeds();
      await runExternalJobSync();
      const student = await createUserWithToken({ email: "sync-dashboard@example.com" });

      const first = await request(app).get("/api/student/dashboard").set(auth(student));
      await runExternalJobSync();
      const second = await request(app).get("/api/student/dashboard").set(auth(student));

      expect(first.statusCode).toBe(200);
      const storedIds = (await Job.find({ isExternal: true }).select("_id").lean()).map((d) => String(d._id));
      const ids = (res) => res.body.data.recommendedJobs.map((j) => String(j._id)).filter((id) => storedIds.includes(id));
      expect(ids(first).sort()).toEqual(storedIds.sort());
      expect(ids(second).sort()).toEqual(ids(first).sort());
      const all = second.body.data.recommendedJobs.map((j) => String(j._id));
      expect(new Set(all).size).toBe(all.length);
    });

    it("no longer resolves old positional scraped-* ids", async () => {
      mockFeeds();
      await runExternalJobSync();
      const get = jest.spyOn(axios, "get");
      get.mockClear();

      const res = await request(app).get("/api/internships/scraped-rec-job-0");

      expect(res.statusCode).toBe(404);
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/internships/sync/external (older alias)", () => {
    it("is limited to platform admins", async () => {
      const get = mockFeeds();
      const student = await createUserWithToken({ email: "alias-student@example.com" });

      expect((await request(app).post("/api/internships/sync/external")).statusCode).toBe(401);
      expect((await request(app).post("/api/internships/sync/external").set(auth(student))).statusCode).toBe(403);
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/admin/jobs/sync", () => {
    const sync = (identity) => {
      const req = request(app).post("/api/admin/jobs/sync");
      return identity ? req.set(auth(identity)) : req;
    };

    it("lets a platform admin run the sync", async () => {
      mockFeeds();
      const admin = await createUserWithToken({ email: "sync-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });

      const res = await sync(admin);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ success: true, inserted: 3, upserted: 3 });
      expect(await Job.countDocuments({ isExternal: true })).toBe(2);
    });

    it("rejects anonymous users, students and company admins without fetching", async () => {
      const get = mockFeeds();
      const student = await createUserWithToken({ email: "sync-student@example.com" });
      const companyAdmin = await createUserWithToken({
        email: "sync-company-admin@example.com",
        role: "COMPANY_ADMIN",
        userType: "admin",
        companyId: new mongoose.Types.ObjectId(),
      });

      expect((await sync(null)).statusCode).toBe(401);
      expect((await sync(student)).statusCode).toBe(403);
      expect((await sync(companyAdmin)).statusCode).toBe(403);
      expect(get).not.toHaveBeenCalled();
      expect(await Job.countDocuments({ isExternal: true })).toBe(0);
    });
  });
});
