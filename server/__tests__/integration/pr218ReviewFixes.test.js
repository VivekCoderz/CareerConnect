// Review fixes for PR #218: live resume sharing, offer letter PDF, skill catalog, user lookup.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const request = require("supertest");
const app = require("../../app");
const Resume = require("../../models/Resume");
const JobOffer = require("../../models/JobOffer");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;
const phone = (lead) => `${lead}${String(Date.now() + ++seq).slice(-9)}`;
const candidate = () => createUserWithToken({ email: `${uniq("cand")}@candidate.test`, phone: phone(7) });
const employer = async () => {
  const hr = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: phone(8) });
  const profile = await createEmployerProfile(hr.user._id, { companyName: "Fake Review Co" });
  return { ...hr, profile };
};

describe("live resume link (FL-15)", () => {
  it("opens for others only after the owner turns sharing on, without the stored file", async () => {
    const owner = await candidate();
    const resume = await Resume.create({
      user: owner.user._id,
      title: "Fake resume",
      resumeUrl: "https://res.cloudinary.com/fake/raw/upload/private.pdf",
      rawData: { personal: { fullName: "Fake Owner", email: "fake.owner@candidate.test" } },
    });

    for (const id of [resume._id, owner.user._id]) {
      expect((await request(app).get(`/api/resume/live/${id}`)).status).toBe(404);
    }

    const on = await as(owner.token, "post", "/api/resume/live/share").send({ enabled: true });
    expect(on.status).toBe(200);
    const shared = await request(app).get(`/api/resume/live/${resume._id}`);
    expect(shared.status).toBe(200);
    expect(JSON.stringify(shared.body)).not.toMatch(/cloudinary|private\.pdf/);

    const mine = await as(owner.token, "get", "/api/resume/live");
    expect(mine.body.shared).toBe(true);

    await as(owner.token, "post", "/api/resume/live/share").send({ enabled: false });
    expect((await request(app).get(`/api/resume/live/${resume._id}`)).status).toBe(404);
  });
});

describe("offer letter PDF", () => {
  it("is not available to an employer who does not own the offer", async () => {
    const owner = await employer();
    const other = await employer();
    const cand = await candidate();
    const job = await createTestJob(owner.profile._id, { createdBy: owner.user._id });
    const offer = await JobOffer.create({
      employerId: owner.profile._id,
      candidateId: cand.user._id,
      jobId: job._id,
      designation: "Fake Analyst",
      salary: 300000,
      joiningDate: new Date(Date.now() + 20 * 864e5),
      expiryDate: new Date(Date.now() + 10 * 864e5),
    });

    expect((await as(other.token, "get", `/api/offers/${offer._id}/pdf`)).status).toBe(403);
    expect((await as(owner.token, "get", `/api/offers/${offer._id}/pdf`)).status).not.toBe(403);
  });
});

describe("skill catalog and user lookup", () => {
  it("only lets admins change skills", async () => {
    const user = await candidate();
    expect((await as(user.token, "post", "/api/skills").send({ name: "Fake Skill" })).status).toBe(403);
  });

  it("does not let one user look up another", async () => {
    const a = await candidate();
    const b = await candidate();
    expect((await as(a.token, "get", `/api/users/${b.user._id}`)).status).toBe(404);
    expect((await as(a.token, "get", `/api/users/${a.user._id}`)).status).toBe(200);
  });
});
