// Employment type and work mode have no model defaults: the employer chooses them, and
// nothing adds "Full-time" or "Hybrid" silently.
const request = require("supertest");
const app = require("../../app");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const setup = async () => {
  const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: `8${String(Date.now() + ++seq).slice(-9)}` });
  const profile = await createEmployerProfile(employer.user._id, { companyName: "Fake Kind Co" });
  return { employer, profile };
};
const base = { title: "Fake Kind Role", location: "Remote", description: "A fake listing used only in tests." };

describe("employment type and work mode are chosen, not defaulted", () => {
  it("job create: 400 without employment type or work mode, 201 with both, stored as sent", async () => {
    const { employer } = await setup();
    const post = (body) => as(employer.token, "post", "/api/jobs").send(body);

    const noType = await post({ ...base, workMode: "Remote" });
    expect(noType.statusCode).toBe(400);
    expect(noType.body.message).toBe("Employment type is required");
    const noMode = await post({ ...base, employmentType: "Part-time" });
    expect(noMode.statusCode).toBe(400);
    expect(noMode.body.message).toBe("Work mode is required");
    const badMode = await post({ ...base, employmentType: "Part-time", workMode: "Fake-mode" });
    expect(badMode.statusCode).toBe(400);
    expect(badMode.body.message).toMatch(/Work mode must be one of/);

    const ok = await post({ ...base, employmentType: "Part-time", workMode: "On-site" });
    expect(ok.statusCode).toBe(201);
    const stored = await Job.findById(ok.body.job._id).lean();
    expect(stored).toMatchObject({ employmentType: "Part-time", workMode: "On-site" });
    expect(await Job.countDocuments({ title: base.title })).toBe(1);
  });

  it("internship create: 400 without work mode, 201 with it", async () => {
    const { employer } = await setup();
    const missing = await as(employer.token, "post", "/api/internships").send(base);
    expect(missing.statusCode).toBe(400);
    expect(missing.body.message).toBe("Work mode is required");

    const ok = await as(employer.token, "post", "/api/internships").send({ ...base, workMode: "Hybrid" });
    expect(ok.statusCode).toBe(201);
    expect((await Internship.findById(ok.body.internship._id).lean()).workMode).toBe("Hybrid");
  });

  it("update: can't clear or set an invalid value; other edits leave them as they are", async () => {
    const { employer } = await setup();
    const created = await as(employer.token, "post", "/api/jobs").send({ ...base, employmentType: "Contract", workMode: "Remote" });
    const path = `/api/jobs/${created.body.job._id}`;

    expect((await as(employer.token, "put", path).send({ workMode: "" })).statusCode).toBe(400);
    expect((await as(employer.token, "put", path).send({ employmentType: "Fake-type" })).statusCode).toBe(400);
    expect((await as(employer.token, "put", path).send({ openings: 3 })).statusCode).toBe(200);
    expect(await Job.findById(created.body.job._id).lean()).toMatchObject({ employmentType: "Contract", workMode: "Remote" });
  });

  it("admin 'Post for an employer' needs them too", async () => {
    const { profile } = await setup();
    const admin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const post = (body) => as(admin.token, "post", "/api/admin/opportunities").send({ employerProfileId: profile._id, ...base, ...body });

    expect((await post({ type: "job", workMode: "Remote" })).statusCode).toBe(400);
    expect((await post({ type: "internship" })).statusCode).toBe(400);
    const job = await post({ type: "job", employmentType: "Full-time", workMode: "Hybrid" });
    expect(job.statusCode).toBe(201);
    const internship = await post({ type: "internship", workMode: "On-site" });
    expect(internship.statusCode).toBe(201);
    expect((await Internship.findById(internship.body.opportunity._id).lean()).workMode).toBe("On-site");
  });

  it("models add no default, and stored documents keep what they have", async () => {
    const bare = await Job.create({ title: "Fake Bare Model Job", location: "Remote", description: "Fake." });
    expect(bare.employmentType).toBeUndefined();
    expect(bare.workMode).toBeUndefined();
    const bareInternship = await Internship.create({ title: "Fake Bare Model Internship", location: "Remote", description: "Fake." });
    expect(bareInternship.workMode).toBeUndefined();

    // An older document saved with the old defaults keeps them.
    const { insertedId } = await Job.collection.insertOne({
      title: "Fake Old Job", location: "Remote", description: "Fake.", employmentType: "Full-time", workMode: "Hybrid",
    });
    expect(await Job.findById(insertedId).lean()).toMatchObject({ employmentType: "Full-time", workMode: "Hybrid" });
  });
});
