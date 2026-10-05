// T10: remaining admin / employer bug report items (ADM-06, ADM-11/12, BUG-05..13,
// unpublished company profile).
const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Company = require("../../models/Company");
const EmployerProfile = require("../../models/EmployerProfile");
const Interview = require("../../models/Interview");
const Job = require("../../models/Job");
const JobOffer = require("../../models/JobOffer");
const User = require("../../models/User");
const { checkTransition } = require("../../utils/applicationStatus");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const createEmployer = async ({ companyId, companyName = "Fake Employer Co" } = {}) => {
  const employer = await createEmployerWithToken({
    email: `${uniq("hr")}@employer.test`,
    phone: `8${String(Date.now() + ++seq).slice(-9)}`,
    ...(companyId ? { companyId } : {}),
  });
  const profile = await createEmployerProfile(employer.user._id, { companyName });
  return { ...employer, profile };
};

const createCandidate = () => createUserWithToken({
  email: `${uniq("cand")}@candidate.test`,
  phone: `7${String(Date.now() + ++seq).slice(-9)}`,
});

const createApplication = async (employer, candidate, status = "Applied", jobOverrides = {}) => {
  const job = await createTestJob(employer.profile._id, { createdBy: employer.user._id, ...jobOverrides });
  return Application.create({
    candidateId: candidate.user._id,
    jobId: job._id,
    employerId: employer.profile._id,
    opportunityType: "Job",
    opportunityTitle: job.title,
    companyName: "Fake Employer Co",
    status,
  });
};

describe("ADM-06 company settings only change the fields sent", () => {
  const setup = async () => {
    const company = await Company.create({
      name: uniq("Settings Co"),
      description: "Original description",
      website: "https://settings.example.test",
      settings: { allowedDomains: ["settings.example.test"], emailNotifications: true, autoShortlist: false },
    });
    const superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const companyAdmin = await createUserWithToken({
      email: `${uniq("cadmin")}@settings.example.test`, role: "COMPANY_ADMIN", userType: "admin", companyId: company._id,
    });
    return { company, superAdmin, companyAdmin };
  };

  it("super admin: one setting changes, the other settings and fields stay; status is not editable here", async () => {
    const { company, superAdmin } = await setup();
    const res = await as(superAdmin.token, "put", `/api/admin/companies/${company._id}`)
      .send({ settings: { emailNotifications: false }, status: "inactive", website: "https://new.example.test" });
    expect(res.statusCode).toBe(200);

    const stored = await Company.findById(company._id).lean();
    expect(stored.settings).toMatchObject({
      allowedDomains: ["settings.example.test"], emailNotifications: false, autoShortlist: false,
    });
    expect(stored.website).toBe("https://new.example.test");
    expect(stored.description).toBe("Original description");
    expect(stored.status).toBe("active");

    const empty = await as(superAdmin.token, "put", `/api/admin/companies/${company._id}`).send({ status: "inactive" });
    expect(empty.statusCode).toBe(400);
    const wrongType = await as(superAdmin.token, "put", `/api/admin/companies/${company._id}`)
      .send({ settings: { autoShortlist: "yes" } });
    expect(wrongType.statusCode).toBe(400);
  });

  it("company admin: settings are merged key by key and the name can't be changed", async () => {
    const { company, companyAdmin } = await setup();
    const res = await as(companyAdmin.token, "put", "/api/admin/company")
      .send({ settings: { autoShortlist: true }, description: "Updated by company admin", name: "Renamed Co" });
    expect(res.statusCode).toBe(200);

    const stored = await Company.findById(company._id).lean();
    expect(stored.settings).toMatchObject({
      allowedDomains: ["settings.example.test"], emailNotifications: true, autoShortlist: true,
    });
    expect(stored.description).toBe("Updated by company admin");
    expect(stored.name).toBe(company.name);
  });
});

describe("ADM-11/12 inactive or deleted company", () => {
  const setup = async () => {
    const company = await Company.create({ name: uniq("Fading Co"), status: "active" });
    const superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const companyAdmin = await createUserWithToken({
      email: `${uniq("cadmin")}@fading.test`, role: "COMPANY_ADMIN", userType: "admin",
      companyId: company._id, password: "Fake@Pass123",
    });
    const employer = await createEmployer({ companyId: company._id });
    await EmployerProfile.updateOne({ _id: employer.profile._id }, { $set: { isPublished: true } });
    const published = await createTestJob(employer.profile._id, { createdBy: employer.user._id, companyId: company._id });
    const pending = await createTestJob(employer.profile._id, {
      createdBy: employer.user._id, companyId: company._id, status: "Pending Approval",
    });
    const candidate = await createCandidate();
    const application = await Application.create({
      candidateId: candidate.user._id, jobId: published._id, employerId: employer.profile._id,
      companyId: company._id, opportunityType: "Job", opportunityTitle: published.title,
    });
    return { company, superAdmin, companyAdmin, employer, published, pending, application };
  };

  const expectCompanyShutOut = async ({ companyAdmin, employer, published, pending, application }) => {
    for (const listing of [published, pending]) {
      const stored = await Job.findById(listing._id).lean();
      expect(stored).toMatchObject({ status: "Closed", closedReason: "company_inactive" });
    }
    expect(await Application.exists({ _id: application._id })).toBeTruthy();

    const post = await as(employer.token, "post", "/api/jobs")
      .send({
        title: "Should not post", employmentType: "Full-time", workMode: "Remote", location: "Remote",
        description: "A listing from an inactive company.",
      });
    expect(post.statusCode).toBe(403);
    expect(post.body.code).toBe("COMPANY_INACTIVE");

    expect((await as(companyAdmin.token, "get", "/api/admin/dashboard")).statusCode).toBe(403);
    expect((await request(app).get(`/api/companies/${employer.profile._id}`)).statusCode).toBe(404);
  };

  it("deactivating closes its listings, blocks posting and company-admin access, hides the profile, keeps data", async () => {
    const data = await setup();
    expect((await request(app).get(`/api/companies/${data.employer.profile._id}`)).statusCode).toBe(200);

    const res = await as(data.superAdmin.token, "patch", `/api/admin/companies/${data.company._id}/status`)
      .send({ status: "inactive" });
    expect(res.statusCode).toBe(200);
    expect(res.body.closedListings).toEqual({ jobs: 2, internships: 0 });
    await expectCompanyShutOut(data);

    const login = await request(app).post("/api/admin/login")
      .send({ email: data.companyAdmin.user.email, password: "Fake@Pass123" });
    expect(login.statusCode).toBe(403);
    expect(login.body.code).toBe("COMPANY_INACTIVE");

    // Reactivating restores posting (listings stay closed, like a rejected employer's).
    await as(data.superAdmin.token, "patch", `/api/admin/companies/${data.company._id}/status`).send({ status: "active" });
    const post = await as(data.employer.token, "post", "/api/jobs")
      .send({
        title: "Back in business", employmentType: "Full-time", workMode: "Remote", location: "Remote",
        description: "A listing after reactivation.",
      });
    expect(post.statusCode).toBe(201);
  });

  it("deleting is a soft delete: data and user links stay, everything is hidden", async () => {
    const data = await setup();
    const res = await as(data.superAdmin.token, "delete", `/api/admin/companies/${data.company._id}`);
    expect(res.statusCode).toBe(200);

    const stored = await Company.findById(data.company._id).lean();
    expect(stored).toMatchObject({ status: "deleted" });
    expect(stored.deletedAt).toBeInstanceOf(Date);
    expect(String((await User.findById(data.employer.user._id).lean()).companyId)).toBe(String(data.company._id));
    expect((await as(data.superAdmin.token, "get", `/api/admin/companies/${data.company._id}`)).statusCode).toBe(404);
    const list = await as(data.superAdmin.token, "get", "/api/admin/companies");
    expect(list.body.companies.map((c) => String(c._id))).not.toContain(String(data.company._id));

    // The employer's account is deactivated with the company; re-enable it to check the rest.
    await User.updateOne({ _id: data.employer.user._id }, { $set: { isActive: true } });
    await User.updateOne({ _id: data.companyAdmin.user._id }, { $set: { isActive: true } });
    await expectCompanyShutOut(data);
  });

  it("an inactive company no longer shares its applications with colleagues", async () => {
    const data = await setup();
    const colleague = await createEmployer({ companyId: data.company._id });
    const before = await as(colleague.token, "get", "/api/applications/employer/list");
    expect(before.body.applications.map((a) => String(a._id))).toContain(String(data.application._id));

    await Company.updateOne({ _id: data.company._id }, { $set: { status: "inactive" } });
    const after = await as(colleague.token, "get", "/api/applications/employer/list");
    expect(after.body.applications.map((a) => String(a._id))).not.toContain(String(data.application._id));
  });
});

describe("public company profile", () => {
  it("is 404 unless published and approved", async () => {
    const employer = await createEmployer();
    const path = `/api/companies/${employer.profile._id}`;
    expect((await request(app).get(path)).statusCode).toBe(404); // approved, not published

    await EmployerProfile.updateOne({ _id: employer.profile._id }, { $set: { isPublished: true, verificationStatus: "pending" } });
    expect((await request(app).get(path)).statusCode).toBe(404);

    await EmployerProfile.updateOne({ _id: employer.profile._id }, { $set: { verificationStatus: "approved" } });
    const res = await request(app).get(path);
    expect(res.statusCode).toBe(200);
    expect(res.body.company.companyName).toBe("Fake Employer Co");
  });

  it("an employer can't approve their own profile through a profile update", async () => {
    const employer = await createEmployer();
    await EmployerProfile.updateOne({ _id: employer.profile._id }, { $set: { verificationStatus: "pending", verifiedAt: null } });
    await as(employer.token, "put", "/api/employer/profile")
      .send({ verificationStatus: "approved", verifiedAt: new Date().toISOString(), tagline: "Fake tagline" });
    const stored = await EmployerProfile.findById(employer.profile._id).lean();
    expect(stored.verificationStatus).toBe("pending");
    expect(stored.verifiedAt).toBeNull();
    expect(stored.tagline).toBe("Fake tagline");
  });
});

describe("BUG-05..13 application status transitions (shared map)", () => {
  it("the map allows forward moves and blocks moves out of final statuses", () => {
    expect(checkTransition("Applied", "Shortlisted")).toBeNull();
    expect(checkTransition("Interview Completed", "Selected")).toBeNull();
    expect(checkTransition("Selected", "Offered")).toBeNull();
    expect(checkTransition("Offered", "Hired")).toBeNull();
    expect(checkTransition("Hired", "Applied")).toMatch(/Hired/);
    expect(checkTransition("Under Review", "Applied")).toMatch(/Cannot move/);
    expect(checkTransition("Applied", "Offered")).toMatch(/Cannot move/);
    expect(checkTransition("Withdrawn", "Shortlisted")).toMatch(/Withdrawn/);
    expect(checkTransition("Rejected", "Shortlisted")).toMatch(/Reopen/);
    expect(checkTransition("Rejected", "Under Review", { reopen: true })).toBeNull();
    expect(checkTransition("Withdrawn", "Under Review", { reopen: true })).not.toBeNull();
    expect(checkTransition("Shortlisted", "Withdrawn")).toMatch(/Only the candidate/);
    expect(checkTransition("Shortlisted", "Withdrawn", { actor: "candidate" })).toBeNull();
    expect(checkTransition("shortlisted", "Interview")).toBeNull(); // legacy spelling
  });

  it("single status endpoint follows the map; reopen is the only way back from Rejected", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const hired = await createApplication(employer, candidate, "Hired");
    const withdrawn = await createApplication(employer, candidate, "Withdrawn");
    const rejected = await createApplication(employer, candidate, "Rejected");
    const fresh = await createApplication(employer, candidate, "Applied");
    const setStatus = (id, status) => as(employer.token, "patch", `/api/applications/${id}/status`).send({ status });

    expect((await setStatus(hired._id, "Applied")).statusCode).toBe(409);
    expect((await setStatus(withdrawn._id, "Shortlisted")).statusCode).toBe(409);
    expect((await setStatus(rejected._id, "Shortlisted")).statusCode).toBe(409);
    expect((await setStatus(fresh._id, "Shortlisted")).statusCode).toBe(200);
    expect((await setStatus(fresh._id, "Applied")).statusCode).toBe(409);

    expect((await as(employer.token, "patch", `/api/applications/${withdrawn._id}/pipeline/reopen`).send({})).statusCode).toBe(409);
    const reopened = await as(employer.token, "patch", `/api/applications/${rejected._id}/pipeline/reopen`)
      .send({ remarks: "Second look" });
    expect(reopened.statusCode).toBe(200);
    expect(reopened.body.application.status).toBe("Under Review");
    expect((await setStatus(rejected._id, "Shortlisted")).statusCode).toBe(200);
    expect((await Application.findById(hired._id).lean()).status).toBe("Hired");
  });

  it("ATS stage, move-next, select, reject, round and admin override use the same rules", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const hired = await createApplication(employer, candidate, "Hired");
    const withdrawn = await createApplication(employer, candidate, "Withdrawn");
    const rejected = await createApplication(employer, candidate, "Rejected");
    const shortlisted = await createApplication(employer, candidate, "Shortlisted");
    const path = (id, action) => `/api/applications/${id}/${action}`;

    expect((await as(employer.token, "patch", path(hired._id, "stage")).send({ stage: "Applied" })).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(shortlisted._id, "stage")).send({ stage: "Withdrawn" })).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(rejected._id, "pipeline/move-next")).send({})).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(withdrawn._id, "pipeline/select")).send({})).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(hired._id, "pipeline/reject")).send({})).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(hired._id, "pipeline/round")).send({ roundIndex: 0, status: "Scheduled" })).statusCode).toBe(409);
    expect((await as(employer.token, "patch", path(shortlisted._id, "pipeline/select")).send({})).statusCode).toBe(200);

    const superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const override = await as(superAdmin.token, "patch", `/api/admin/applications/${hired._id}/status`).send({ status: "Applied" });
    expect(override.statusCode).toBe(409);

    for (const app of [hired, withdrawn, rejected]) {
      expect((await Application.findById(app._id).lean()).status).toBe(app.status);
    }
  });

  it("bulk update skips applications the map doesn't allow", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const apps = await Promise.all(["Hired", "Withdrawn", "Rejected", "Applied"]
      .map((status) => createApplication(employer, candidate, status)));

    const res = await as(employer.token, "patch", "/api/applications/bulk-status")
      .send({ applicationIds: apps.map((a) => a._id), status: "Shortlisted" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ updated: 1, skipped: 3 });
    const statuses = await Promise.all(apps.map(async (a) => (await Application.findById(a._id).lean()).status));
    expect(statuses).toEqual(["Hired", "Withdrawn", "Rejected", "Shortlisted"]);
  });

  it("a candidate can't withdraw a hired application", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const hired = await createApplication(employer, candidate, "Hired");
    const res = await as(candidate.token, "patch", `/api/applications/${hired._id}/withdraw`);
    expect(res.statusCode).toBe(409);
  });
});

describe("BUG-05..13 interview eligibility and rounds", () => {
  const schedule = (employer, applicationId, roundNumber, day) =>
    as(employer.token, "post", "/api/interviews").send({
      applicationId, roundNumber, scheduledDate: daysFromNow(day), startTime: "10:30 AM",
      interviewType: "Online", meetingLink: "https://meet.example.test/fake-room",
    });

  it("only the owning employer, only interview-eligible statuses", async () => {
    const owner = await createEmployer();
    const stranger = await createEmployer();
    const candidate = await createCandidate();
    const applied = await createApplication(owner, candidate, "Applied");
    const hired = await createApplication(owner, candidate, "Hired");
    const shortlisted = await createApplication(owner, candidate, "Shortlisted");

    expect((await schedule(stranger, shortlisted._id, 1, 3)).statusCode).toBe(404);
    const notEligible = await schedule(owner, applied._id, 1, 3);
    expect(notEligible.statusCode).toBe(400);
    expect(notEligible.body.code).toBe("NOT_INTERVIEW_ELIGIBLE");
    expect((await schedule(owner, hired._id, 1, 3)).body.code).toBe("NOT_INTERVIEW_ELIGIBLE");

    // A stage name mentioning "interview" no longer makes an Applied application eligible.
    await Application.updateOne({ _id: applied._id }, { $set: { stage: "Technical Interview", overallStatus: "In Progress" } });
    expect((await schedule(owner, applied._id, 1, 3)).body.code).toBe("NOT_INTERVIEW_ELIGIBLE");
  });

  it("rounds are sequential with no duplicates", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const app = await createApplication(employer, candidate, "Shortlisted");

    expect((await schedule(employer, app._id, 2, 3)).body.code).toBe("ROUND_OUT_OF_ORDER");
    const first = await schedule(employer, app._id, 1, 3);
    expect(first.statusCode).toBe(201);
    expect((await schedule(employer, app._id, 1, 4)).body.code).toBe("DUPLICATE_ROUND");
    expect((await schedule(employer, app._id, 2, 5)).body.code).toBe("PREVIOUS_ROUND_NOT_PASSED");

    await Interview.updateOne({ _id: first.body.interview._id }, { $set: { status: "completed", result: "passed" } });
    expect((await schedule(employer, app._id, 3, 6)).body.code).toBe("ROUND_OUT_OF_ORDER");
    expect((await schedule(employer, app._id, 2, 6)).statusCode).toBe(201);
    expect((await schedule(employer, app._id, 1, 7)).body.code).toBe("DUPLICATE_ROUND");
    expect(await Interview.countDocuments({ applicationId: app._id })).toBe(2);
  });

  it("a cancelled round can be scheduled again; cancelling doesn't revive a rejected application", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const app = await createApplication(employer, candidate, "Shortlisted");
    const first = await schedule(employer, app._id, 1, 3);
    expect(first.statusCode).toBe(201);

    await Application.updateOne({ _id: app._id }, { $set: { status: "Rejected" } });
    const cancel = await as(employer.token, "patch", `/api/interviews/${first.body.interview._id}/cancel`)
      .send({ cancellationReason: "Fake reason" });
    expect(cancel.statusCode).toBe(200);
    const stored = await Application.findById(app._id).lean();
    expect(stored.status).toBe("Rejected");
    expect(stored.notes.some((n) => /cancelled/.test(n.text))).toBe(true);

    await Application.updateOne({ _id: app._id }, { $set: { status: "Shortlisted" } });
    expect((await schedule(employer, app._id, 1, 4)).statusCode).toBe(201);
  });
});

describe("BUG-05..13 offers", () => {
  const offer = (employer, application, overrides = {}) =>
    as(employer.token, "post", "/api/offers").send({
      candidateId: application.candidateId, jobId: application.jobId, applicationId: application._id,
      salary: 600000, joiningDate: daysFromNow(30), expiryDate: daysFromNow(10), ...overrides,
    });

  it("no past joining or expiry date, only offerable statuses, one active offer at a time", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const selected = await createApplication(employer, candidate, "Selected");
    const applied = await createApplication(employer, candidate, "Applied");

    expect((await offer(employer, selected, { joiningDate: daysFromNow(-1) })).statusCode).toBe(400);
    expect((await offer(employer, selected, { expiryDate: daysFromNow(-1) })).statusCode).toBe(400);
    // QA bug 13: the answer deadline can't be after the joining date.
    expect((await offer(employer, selected, { joiningDate: daysFromNow(5), expiryDate: daysFromNow(10) })).statusCode).toBe(400);
    expect((await offer(employer, applied)).body.code).toBe("INVALID_STATUS_TRANSITION");

    const first = await offer(employer, selected);
    expect(first.statusCode).toBe(201);
    expect((await Application.findById(selected._id).lean()).status).toBe("Offered");
    const second = await offer(employer, selected);
    expect(second.statusCode).toBe(409);
    expect(second.body.code).toBe("ACTIVE_OFFER_EXISTS");

    // Once the first offer has expired, a new one can be sent.
    await JobOffer.updateOne({ _id: first.body.offer._id }, { $set: { expiryDate: new Date(Date.now() - 60000) } });
    expect((await offer(employer, selected)).statusCode).toBe(201);
    expect(await JobOffer.countDocuments({ applicationId: selected._id })).toBe(2);
  });

  it("two offers sent at the same moment create only one", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const selected = await createApplication(employer, candidate, "Selected");
    const results = await Promise.all([offer(employer, selected), offer(employer, selected)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await JobOffer.countDocuments({ applicationId: selected._id })).toBe(1);
  });

  it("another employer can't send an offer on someone else's application", async () => {
    const owner = await createEmployer();
    const stranger = await createEmployer();
    const candidate = await createCandidate();
    const selected = await createApplication(owner, candidate, "Selected");
    expect((await offer(stranger, selected)).statusCode).toBe(403);
  });
});

describe("BUG-05..13 one ownership helper", () => {
  it("another employer can't read or change an application, its notes, stage or listing", async () => {
    const owner = await createEmployer();
    const stranger = await createEmployer({ companyName: "Stranger Co" });
    const candidate = await createCandidate();
    const app = await createApplication(owner, candidate, "Shortlisted");
    const base = `/api/applications/${app._id}`;

    expect((await as(stranger.token, "get", base)).statusCode).toBe(403);
    expect((await as(stranger.token, "patch", `${base}/status`).send({ status: "Interview" })).statusCode).toBe(404);
    expect((await as(stranger.token, "patch", `${base}/stage`).send({ stage: "Interview" })).statusCode).toBe(404);
    expect((await as(stranger.token, "post", `${base}/notes`).send({ text: "Fake note" })).statusCode).toBe(404);
    expect((await as(stranger.token, "patch", `${base}/pipeline/select`).send({})).statusCode).toBe(404);
    expect((await as(stranger.token, "put", `/api/jobs/${app.jobId}`).send({ title: "Hijacked" })).statusCode).toBe(404);
    expect((await as(owner.token, "get", base)).statusCode).toBe(200);
  });
});
