const request = require("supertest");
const app = require("../../app");
const AuditLog = require("../../models/AuditLog");
const EmployerProfile = require("../../models/EmployerProfile");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const { approveLegacyEmployers } = require("../../scripts/approve-existing-employers");
const { createTestJob } = require("../helpers/createTestJob");
const {
  createEmployerWithToken,
  createUserWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const publicJobIds = async () =>
  (await request(app).get("/api/jobs?source=campus&limit=50")).body.jobs.map((j) => String(j._id));
const publicInternshipIds = async () =>
  (await request(app).get("/api/internships?source=campus&limit=50")).body.internships.map((i) => String(i._id));

describe("rejecting an employer closes their listings", () => {
  let admin;
  let employer;
  let profile;
  let other;
  let otherProfile;

  const listingsFor = async (owner, ownerProfile, prefix) => ({
    published: await createTestJob(ownerProfile._id, { title: `${prefix} live job`, createdBy: owner.user._id }),
    pending: await createTestJob(ownerProfile._id, {
      title: `${prefix} pending job`, createdBy: owner.user._id, status: "Pending Approval",
    }),
    paused: await createTestJob(ownerProfile._id, { title: `${prefix} paused job`, createdBy: owner.user._id, status: "Paused" }),
    internship: await Internship.create({
      title: `${prefix} internship`, location: "Remote", description: "x",
      employerId: ownerProfile._id, createdBy: owner.user._id, status: "Published",
    }),
  });

  const verify = (status, reason) =>
    request(app).patch(`/api/admin/employers/${profile._id}/verification`).set(auth(admin)).send({ status, reason });

  beforeEach(async () => {
    admin = await createUserWithToken({ email: "rej-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });
    employer = await createEmployerWithToken({ email: "rej-employer@example.com" });
    other = await createEmployerWithToken({ email: "rej-other@example.com" });
    profile = await createEmployerProfile(employer.user._id, { companyName: "Rejected Co" });
    otherProfile = await createEmployerProfile(other.user._id, { companyName: "Fine Co" });
  });

  it("closes Published and Pending Approval listings and removes them from public lists", async () => {
    const mine = await listingsFor(employer, profile, "Mine");
    expect(await publicJobIds()).toContain(String(mine.published._id));

    const res = await verify("rejected", "Fake company");
    expect(res.status).toBe(200);
    expect(res.body.closedListings).toEqual({ jobs: 2, internships: 1 });

    for (const listing of [mine.published, mine.pending]) {
      const stored = await Job.findById(listing._id).lean();
      expect(stored).toMatchObject({ status: "Closed", closedReason: "employer_rejected" });
      expect(stored.closedAt).toBeTruthy();
    }
    expect((await Internship.findById(mine.internship._id).lean()).closedReason).toBe("employer_rejected");
    expect((await Job.findById(mine.paused._id).lean())).toMatchObject({ status: "Paused", closedReason: null });

    expect(await publicJobIds()).not.toContain(String(mine.published._id));
    expect(await publicInternshipIds()).not.toContain(String(mine.internship._id));
    expect((await request(app).get(`/api/jobs/${mine.published._id}`)).status).toBe(404);

    const log = await AuditLog.findOne({ action: "REJECT_EMPLOYER" }).lean();
    expect(log.details).toMatch(/Closed 2 job\(s\) and 1 internship\(s\) \(employer_rejected\)/);
  });

  it("leaves other employers' listings untouched", async () => {
    await listingsFor(employer, profile, "Mine");
    const theirs = await listingsFor(other, otherProfile, "Theirs");

    await verify("rejected");

    expect((await Job.findById(theirs.published._id).lean()).status).toBe("Published");
    expect((await Job.findById(theirs.pending._id).lean()).status).toBe("Pending Approval");
    expect((await Internship.findById(theirs.internship._id).lean()).status).toBe("Published");
    expect(await publicJobIds()).toContain(String(theirs.published._id));
  });

  it("does not reopen listings when the employer is approved again", async () => {
    const mine = await listingsFor(employer, profile, "Mine");
    await verify("rejected");

    const approved = await verify("approved");
    expect(approved.status).toBe(200);
    expect(approved.body.closedListings).toEqual({ jobs: 0, internships: 0 });

    expect((await Job.findById(mine.published._id).lean())).toMatchObject({
      status: "Closed",
      closedReason: "employer_rejected",
    });
    expect(await publicJobIds()).not.toContain(String(mine.published._id));
  });

  it("closes listings that store the owner's user id in employerId", async () => {
    const legacy = await createTestJob(employer.user._id, { title: "Legacy job", createdBy: null });
    await verify("rejected");
    expect((await Job.findById(legacy._id).lean()).status).toBe("Closed");
  });
});

describe("save job endpoint", () => {
  it("returns 501 instead of pretending to save", async () => {
    const candidate = await createUserWithToken({ email: "save-candidate@example.com" });
    const res = await request(app)
      .post("/api/student/save")
      .set(auth(candidate))
      .send({ opportunityId: "abc", title: "Job", type: "Job" });

    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ success: false, message: "Not available yet" });
  });
});

describe("approve-existing-employers backfills approvedAt", () => {
  it("only writes approvedAt and approvalMethod with --apply", async () => {
    const legacyOwner = await createEmployerWithToken({ email: "legacy-owner@example.com" });
    await EmployerProfile.collection.insertOne({ userId: legacyOwner.user._id, companyName: "Legacy Co" });
    const legacyProfile = await EmployerProfile.findOne({ userId: legacyOwner.user._id }).lean();
    const created = new Date("2026-01-15T10:00:00Z");
    const live = await createTestJob(legacyProfile._id, { createdBy: legacyOwner.user._id });
    await Job.collection.updateOne({ _id: live._id }, { $set: { createdAt: created } });
    const draft = await createTestJob(legacyProfile._id, { createdBy: legacyOwner.user._id, status: "Draft" });
    const internship = await Internship.create({
      title: "Legacy internship", location: "Remote", description: "x",
      employerId: legacyProfile._id, createdBy: legacyOwner.user._id, status: "Published",
    });

    const someoneElse = await createEmployerWithToken({ email: "approved-already@example.com" });
    const approvedProfile = await createEmployerProfile(someoneElse.user._id);
    const notTheirs = await createTestJob(approvedProfile._id, { createdBy: someoneElse.user._id });
    const log = () => {};

    const dry = await approveLegacyEmployers({ log });
    expect(dry).toMatchObject({
      matched: 1,
      approved: 0,
      listingsToBackfill: { jobs: 1, internships: 1 },
      listingsBackfilled: { jobs: 0, internships: 0 },
    });
    expect((await Job.findById(live._id).lean()).approvedAt).toBeNull();

    const applied = await approveLegacyEmployers({ apply: true, log });
    expect(applied).toMatchObject({ approved: 1, listingsBackfilled: { jobs: 1, internships: 1 } });

    const storedLive = await Job.findById(live._id).lean();
    expect(storedLive.approvalMethod).toBe("legacy");
    expect(storedLive.approvedAt.toISOString()).toBe(created.toISOString());
    expect((await Internship.findById(internship._id).lean()).approvalMethod).toBe("legacy");
    expect((await Job.findById(draft._id).lean()).approvedAt).toBeNull();
    expect((await Job.findById(notTheirs._id).lean()).approvedAt).toBeNull();

    // The backfilled listing can now be paused and re-opened by its (approved) employer.
    const path = `/api/jobs/${live._id}/status`;
    expect((await request(app).patch(path).set(auth(legacyOwner)).send({ status: "Paused" })).status).toBe(200);
    expect((await request(app).patch(path).set(auth(legacyOwner)).send({ status: "Published" })).status).toBe(200);
  });
});
