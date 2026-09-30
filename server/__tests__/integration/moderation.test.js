const axios = require("axios");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const { createEmployerWithToken, createUserWithToken } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

const jobPayload = (overrides = {}) => ({
  title: "Moderated Backend Developer",
  location: "Bangalore",
  description: "Build APIs for a moderated job board.",
  status: "Published",
  ...overrides,
});

const internshipPayload = (overrides = {}) => ({
  title: "Moderated Design Intern",
  location: "Remote",
  description: "Help design a moderated job board.",
  status: "Published",
  ...overrides,
});

const idsOf = (items = []) => items.map((item) => String(item._id));

describe("listing moderation (S03)", () => {
  let employer;
  let admin;

  beforeEach(async () => {
    employer = await createEmployerWithToken({ email: "mod-employer@example.com" });
    admin = await createUserWithToken({
      email: "mod-admin@example.com",
      fullName: "Platform Admin",
      role: "SUPER_ADMIN",
      userType: "admin",
    });
    await EmployerProfile.create({
      userId: employer.user._id,
      companyName: "Moderation Co",
      industry: "Technology",
    });
  });

  const createJobAsEmployer = async (overrides) => {
    const res = await request(app).post("/api/jobs").set(auth(employer)).send(jobPayload(overrides));
    expect(res.status).toBe(201);
    return res.body.job;
  };

  const createInternshipAsEmployer = async (overrides) => {
    const res = await request(app)
      .post("/api/internships")
      .set(auth(employer))
      .send(internshipPayload(overrides));
    expect(res.status).toBe(201);
    return res.body.internship;
  };

  const approve = (type, id) =>
    request(app).post(`/api/admin/opportunities/${type}/${id}/approve`).set(auth(admin)).send({});

  describe("creating listings", () => {
    it("saves an employer job sent as Published as Pending Approval", async () => {
      const job = await createJobAsEmployer();

      expect(job.status).toBe("Pending Approval");
      const stored = await Job.findById(job._id).lean();
      expect(stored.status).toBe("Pending Approval");
      expect(stored.approvedAt).toBeNull();
    });

    it("saves an employer internship sent as Published as Pending Approval", async () => {
      const internship = await createInternshipAsEmployer();

      expect(internship.status).toBe("Pending Approval");
      const stored = await Internship.findById(internship._id).lean();
      expect(stored.status).toBe("Pending Approval");
      expect(stored.approvedAt).toBeNull();
    });

    it("keeps an explicit draft as Draft", async () => {
      const job = await createJobAsEmployer({ status: "Draft" });
      const internship = await createInternshipAsEmployer({ status: "Draft" });

      expect(job.status).toBe("Draft");
      expect(internship.status).toBe("Draft");
    });

    it("ignores other employer-supplied statuses", async () => {
      const job = await createJobAsEmployer({ status: "Paused" });
      expect(job.status).toBe("Pending Approval");
    });
  });

  describe("employer status changes", () => {
    it("rejects publishing a pending job with 403", async () => {
      const job = await createJobAsEmployer();

      const res = await request(app)
        .patch(`/api/jobs/${job._id}/status`)
        .set(auth(employer))
        .send({ status: "Published" });

      expect(res.status).toBe(403);
      expect((await Job.findById(job._id).lean()).status).toBe("Pending Approval");
    });

    it("rejects publishing a pending internship with 403", async () => {
      const internship = await createInternshipAsEmployer();

      const res = await request(app)
        .patch(`/api/internships/${internship._id}/status`)
        .set(auth(employer))
        .send({ status: "Published" });

      expect(res.status).toBe(403);
      expect((await Internship.findById(internship._id).lean()).status).toBe("Pending Approval");
    });

    it("rejects publishing a draft that was never approved, even via Paused", async () => {
      const job = await createJobAsEmployer({ status: "Draft" });
      const path = `/api/jobs/${job._id}/status`;

      const direct = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(direct.status).toBe(403);

      const paused = await request(app).patch(path).set(auth(employer)).send({ status: "Paused" });
      expect(paused.status).toBe(200);
      const viaPaused = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(viaPaused.status).toBe(403);
    });

    it("returns 400 for a status outside the allowed list", async () => {
      const job = await createJobAsEmployer();

      for (const status of ["Rejected", "Live", undefined]) {
        const res = await request(app)
          .patch(`/api/jobs/${job._id}/status`)
          .set(auth(employer))
          .send({ status });
        expect(res.status).toBe(400);
      }
      expect((await Job.findById(job._id).lean()).status).toBe("Pending Approval");
    });

    it("lets an employer submit a draft for approval", async () => {
      const internship = await createInternshipAsEmployer({ status: "Draft" });

      const res = await request(app)
        .patch(`/api/internships/${internship._id}/status`)
        .set(auth(employer))
        .send({ status: "Pending Approval" });

      expect(res.status).toBe(200);
      expect(res.body.internship.status).toBe("Pending Approval");
    });

    it("lets an employer pause and re-open an approved job", async () => {
      const job = await createJobAsEmployer();
      expect((await approve("job", job._id)).status).toBe(200);
      const path = `/api/jobs/${job._id}/status`;

      const paused = await request(app).patch(path).set(auth(employer)).send({ status: "Paused" });
      expect(paused.body.job.status).toBe("Paused");

      const reopened = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(reopened.status).toBe(200);
      expect(reopened.body.job.status).toBe("Published");
    });

    it("does not let a rejected listing be re-published via Paused", async () => {
      const job = await createJobAsEmployer();
      await approve("job", job._id);
      const rejected = await request(app)
        .post(`/api/admin/opportunities/job/${job._id}/reject`)
        .set(auth(admin))
        .send({ rejectionReason: "Misleading salary information" });
      expect(rejected.status).toBe(200);
      const path = `/api/jobs/${job._id}/status`;

      const direct = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(direct.status).toBe(403);
      await request(app).patch(path).set(auth(employer)).send({ status: "Paused" });
      const viaPaused = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(viaPaused.status).toBe(403);
    });
  });

  describe("editing listings", () => {
    it("ignores the status field on job updates", async () => {
      const job = await createJobAsEmployer();

      const res = await request(app)
        .put(`/api/jobs/${job._id}`)
        .set(auth(employer))
        .send({ title: "Renamed Backend Developer", status: "Published" });

      expect(res.status).toBe(200);
      const stored = await Job.findById(job._id).lean();
      expect(stored.title).toBe("Renamed Backend Developer");
      expect(stored.status).toBe("Pending Approval");
    });

    it("ignores the status field on internship updates", async () => {
      const internship = await createInternshipAsEmployer();

      const res = await request(app)
        .put(`/api/internships/${internship._id}`)
        .set(auth(employer))
        .send({ title: "Renamed Design Intern", status: "Published" });

      expect(res.status).toBe(200);
      const stored = await Internship.findById(internship._id).lean();
      expect(stored.title).toBe("Renamed Design Intern");
      expect(stored.status).toBe("Pending Approval");
    });

    it("ignores status in an edit, and sends an approved job's edited content back for approval", async () => {
      const job = await createJobAsEmployer();
      await approve("job", job._id);

      await request(app)
        .put(`/api/jobs/${job._id}`)
        .set(auth(employer))
        .send({ description: "Updated description", status: "Draft" });

      // Not "Draft" (status in the body is ignored) and not still "Published"
      // (edited content must be approved again, BUG-02).
      expect((await Job.findById(job._id).lean()).status).toBe("Pending Approval");
    });

    it("makes a duplicate of an approved job a draft that still needs approval", async () => {
      const job = await createJobAsEmployer();
      await approve("job", job._id);

      const dup = await request(app).post(`/api/jobs/${job._id}/duplicate`).set(auth(employer));
      expect(dup.status).toBe(201);
      expect(dup.body.job.status).toBe("Draft");
      expect(dup.body.job.approvedAt).toBeNull();

      const path = `/api/jobs/${dup.body.job._id}/status`;
      await request(app).patch(path).set(auth(employer)).send({ status: "Paused" });
      const publish = await request(app).patch(path).set(auth(employer)).send({ status: "Published" });
      expect(publish.status).toBe(403);
    });
  });

  describe("public visibility", () => {
    const publicJobs = () => request(app).get("/api/jobs?source=campus&limit=50");
    const publicInternships = () => request(app).get("/api/internships?source=campus&limit=50");

    it("hides pending listings from the public list and detail pages", async () => {
      const job = await createJobAsEmployer();
      const internship = await createInternshipAsEmployer();

      const [jobs, internships, jobDetail, internshipDetail] = await Promise.all([
        publicJobs(),
        publicInternships(),
        request(app).get(`/api/jobs/${job._id}`),
        request(app).get(`/api/internships/${internship._id}`),
      ]);

      expect(jobs.status).toBe(200);
      expect(idsOf(jobs.body.jobs)).not.toContain(String(job._id));
      expect(internships.status).toBe(200);
      expect(idsOf(internships.body.internships)).not.toContain(String(internship._id));
      expect(jobDetail.status).toBe(404);
      expect(internshipDetail.status).toBe(404);
    });

    it("hides pending listings from other employers", async () => {
      const job = await createJobAsEmployer();
      const other = await createEmployerWithToken({ email: "mod-other@example.com" });

      const res = await request(app).get(`/api/jobs/${job._id}`).set(auth(other));
      expect(res.status).toBe(404);
    });

    it("publishes and shows a job once an admin approves it", async () => {
      const job = await createJobAsEmployer();

      const res = await approve("job", job._id);
      expect(res.status).toBe(200);
      expect(res.body.opportunity.status).toBe("Published");
      const stored = await Job.findById(job._id).lean();
      expect(stored.status).toBe("Published");
      expect(String(stored.approvedBy)).toBe(String(admin.user._id));

      const [jobs, detail] = await Promise.all([publicJobs(), request(app).get(`/api/jobs/${job._id}`)]);
      expect(idsOf(jobs.body.jobs)).toContain(String(job._id));
      expect(detail.status).toBe(200);
    });

    it("publishes and shows an internship once an admin approves it", async () => {
      const internship = await createInternshipAsEmployer();

      const res = await approve("internship", internship._id);
      expect(res.status).toBe(200);
      expect(res.body.opportunity.status).toBe("Published");

      const [internships, detail] = await Promise.all([
        publicInternships(),
        request(app).get(`/api/internships/${internship._id}`),
      ]);
      expect(idsOf(internships.body.internships)).toContain(String(internship._id));
      expect(detail.status).toBe(200);
    });
  });

  describe("model defaults", () => {
    it("defaults listings created without a status to Pending Approval", async () => {
      const job = await Job.create({ title: "No Status Job", location: "Pune", description: "x" });
      const internship = await Internship.create({ title: "No Status Intern", location: "Pune", description: "x" });

      expect(job.status).toBe("Pending Approval");
      expect(internship.status).toBe("Pending Approval");
      const res = await request(app).get(`/api/jobs/${job._id}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/internships/sync/external", () => {
    const remotiveJob = {
      id: 987654,
      title: "Software Engineering Intern",
      company_name: "Remote Co",
      candidate_required_location: "Worldwide",
      description: "Remote internship",
      tags: ["javascript"],
      url: "https://example.com/apply",
    };
    let axiosGet;

    beforeEach(() => {
      axiosGet = jest.spyOn(axios, "get").mockResolvedValue({ data: { jobs: [remotiveJob] } });
    });

    afterEach(() => axiosGet.mockRestore());

    const sync = (identity) => request(app).post("/api/internships/sync/external").set(auth(identity));

    it("returns 403 for employers and does not sync", async () => {
      const res = await sync(employer);

      expect(res.status).toBe(403);
      expect(axiosGet).not.toHaveBeenCalled();
      expect(await Internship.countDocuments({ isExternal: true })).toBe(0);
    });

    it("returns 403 for company admins", async () => {
      const companyAdmin = await createUserWithToken({
        email: "mod-company-admin@example.com",
        role: "COMPANY_ADMIN",
        userType: "admin",
        companyId: new mongoose.Types.ObjectId(),
      });

      const res = await sync(companyAdmin);
      expect(res.status).toBe(403);
      expect(axiosGet).not.toHaveBeenCalled();
    });

    it("lets a platform admin sync, publishing external listings explicitly", async () => {
      const res = await sync(admin);

      expect(res.status).toBe(200);
      expect(res.body.upserted).toBe(1);
      const stored = await Internship.findOne({ source: "Remotive", externalId: "987654" }).lean();
      expect(stored.status).toBe("Published");
      expect(stored.isExternal).toBe(true);
    });
  });
});
