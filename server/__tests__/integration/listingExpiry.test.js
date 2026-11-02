const request = require("supertest");
const app = require("../../app");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const {
  startOfTodayIST,
  isListingExpired,
  closeExpiredListings,
} = require("../../utils/listingExpiry");
const { createTestJob } = require("../helpers/createTestJob");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const HOUR = 60 * 60 * 1000;

describe("deadline = end of that day in IST", () => {
  // "2026-10-15" from a date input is stored as 2026-10-15T00:00:00Z (05:30 IST on the 15th).
  const deadline = new Date("2026-10-15");

  it("computes the start of today in IST", () => {
    expect(startOfTodayIST(new Date("2026-10-15T18:29:59Z")).toISOString()).toBe("2026-10-14T18:30:00.000Z");
    expect(startOfTodayIST(new Date("2026-10-15T18:30:00Z")).toISOString()).toBe("2026-10-15T18:30:00.000Z");
  });

  it("keeps a listing open until 23:59:59 IST on its deadline day", () => {
    expect(isListingExpired({ deadline }, new Date("2026-10-15T03:00:00Z"))).toBe(false); // 08:30 IST
    expect(isListingExpired({ deadline }, new Date("2026-10-15T18:29:59Z"))).toBe(false); // 23:59:59 IST
    expect(isListingExpired({ deadline }, new Date("2026-10-15T18:30:00Z"))).toBe(true); // 00:00 IST on the 16th
    expect(isListingExpired({ deadline: null }, new Date("2030-01-01"))).toBe(false);
  });

  it("the sweep uses the same cutoff", async () => {
    const job = await createTestJob(null, { deadline });
    expect(await closeExpiredListings({ now: new Date("2026-10-15T18:29:59Z") })).toEqual({ jobs: 0, internships: 0 });
    expect(await closeExpiredListings({ now: new Date("2026-10-15T18:30:00Z") })).toEqual({ jobs: 1, internships: 0 });
    expect((await Job.findById(job._id).lean()).status).toBe("Closed");
  });
});

describe("expired listings", () => {
  let employer;
  let profile;
  let candidate;
  let expiredJob;
  let todayJob;
  let openJob;
  let expiredInternship;
  let openInternship;

  const yesterdayIST = () => new Date(startOfTodayIST().getTime() - HOUR);
  const laterTodayIST = () => new Date(startOfTodayIST().getTime() + 20 * HOUR);

  beforeEach(async () => {
    employer = await createEmployerWithToken({ email: "exp-employer@example.com" });
    profile = await createEmployerProfile(employer.user._id, { companyName: "Expiry Co" });
    candidate = await createUserWithToken({ email: "exp-candidate@example.com" });
    const owned = { createdBy: employer.user._id, employerId: profile._id, approvedAt: new Date() };

    expiredJob = await createTestJob(profile._id, { ...owned, title: "Expired job", deadline: yesterdayIST() });
    todayJob = await createTestJob(profile._id, { ...owned, title: "Closes tonight", deadline: laterTodayIST() });
    openJob = await createTestJob(profile._id, { ...owned, title: "No deadline", deadline: null });
    const internship = (title, deadline) => Internship.create({
      title, location: "Remote", description: "x", status: "Published", deadline, ...owned,
    });
    expiredInternship = await internship("Expired internship", yesterdayIST());
    openInternship = await internship("Open internship", laterTodayIST());
  });

  const publicJobIds = async () =>
    (await request(app).get("/api/jobs?source=campus&limit=50")).body.jobs.map((j) => String(j._id));
  const publicInternshipIds = async () =>
    (await request(app).get("/api/internships?source=campus&limit=50")).body.internships.map((i) => String(i._id));

  it("hides expired jobs and internships from public lists and detail pages before the sweep", async () => {
    const jobIds = await publicJobIds();
    expect(jobIds).not.toContain(String(expiredJob._id));
    expect(jobIds).toEqual(expect.arrayContaining([String(todayJob._id), String(openJob._id)]));

    const internshipIds = await publicInternshipIds();
    expect(internshipIds).not.toContain(String(expiredInternship._id));
    expect(internshipIds).toContain(String(openInternship._id));

    expect((await request(app).get(`/api/jobs/${expiredJob._id}`)).status).toBe(404);
    expect((await request(app).get(`/api/internships/${expiredInternship._id}`)).status).toBe(404);
    expect((await request(app).get(`/api/jobs/${todayJob._id}`)).status).toBe(200);
  });

  it("still shows them to the owning employer, marked expired", async () => {
    const mine = await request(app).get("/api/jobs?myJobs=true").set(auth(employer));
    const expired = mine.body.jobs.find((j) => String(j._id) === String(expiredJob._id));
    expect(expired).toBeDefined();
    expect(expired.isExpired).toBe(true);
    expect((await request(app).get(`/api/jobs/${expiredJob._id}`).set(auth(employer))).status).toBe(200);
  });

  it("rejects applications to expired or non-Published listings with 400", async () => {
    const closed = "Applications for this listing are closed";
    const applyJob = (id) => request(app).post(`/api/applications/job/${id}`).set(auth(candidate)).send({});
    const applyInternship = (id) =>
      request(app).post(`/api/applications/internship/${id}`).set(auth(candidate)).send({});

    for (const res of [await applyJob(expiredJob._id), await applyInternship(expiredInternship._id)]) {
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(closed);
    }

    await Job.updateOne({ _id: openJob._id }, { status: "Paused" });
    const paused = await applyJob(openJob._id);
    expect(paused.status).toBe(400);
    expect(paused.body.message).toBe(closed);

    expect((await applyJob(todayJob._id)).status).toBe(201);
  });

  it("sweep closes expired listings with closedReason expired and leaves open ones", async () => {
    const result = await closeExpiredListings();
    expect(result).toEqual({ jobs: 1, internships: 1 });

    for (const stored of [await Job.findById(expiredJob._id).lean(), await Internship.findById(expiredInternship._id).lean()]) {
      expect(stored).toMatchObject({ status: "Closed", closedReason: "expired" });
      expect(stored.closedAt).toBeTruthy();
    }
    for (const id of [todayJob._id, openJob._id]) {
      expect((await Job.findById(id).lean())).toMatchObject({ status: "Published", closedReason: null });
    }
    expect((await Internship.findById(openInternship._id).lean()).status).toBe("Published");
    expect(await closeExpiredListings()).toEqual({ jobs: 0, internships: 0 });
  });

  it("blocks re-opening an expired listing until a future deadline is set", async () => {
    await closeExpiredListings();
    const statusPath = `/api/jobs/${expiredJob._id}/status`;

    const blocked = await request(app).patch(statusPath).set(auth(employer)).send({ status: "Published" });
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/future deadline/);

    const future = new Date(Date.now() + 7 * 24 * HOUR).toISOString().slice(0, 10);
    expect((await request(app).put(`/api/jobs/${expiredJob._id}`).set(auth(employer)).send({ deadline: future })).status).toBe(200);

    const reopened = await request(app).patch(statusPath).set(auth(employer)).send({ status: "Published" });
    expect(reopened.status).toBe(200);
    expect((await Job.findById(expiredJob._id).lean())).toMatchObject({ status: "Published", closedReason: null });
    expect(await publicJobIds()).toContain(String(expiredJob._id));
  });

  it("blocks re-opening an expired internship the same way", async () => {
    await closeExpiredListings();
    const res = await request(app)
      .patch(`/api/internships/${expiredInternship._id}/status`)
      .set(auth(employer))
      .send({ status: "Published" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future deadline/);
  });
});
