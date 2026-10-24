const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const ResumeAsset = require("../../models/ResumeAsset");
const StudentProfile = require("../../models/StudentProfile");
const { cloudinary } = require("../../config/cloudinary");
const { createTestJob } = require("../helpers/createTestJob");
const { giveTestResume } = require("../helpers/createTestResume");
const { createUserWithToken, createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const NO_RESUME = "Please upload your resume before applying for this job.";
const INVALID_RESUME = "The selected resume could not be verified. Please upload your resume and try again.";

describe("JP-01: applying requires a resume", () => {
  let candidate;
  let otherCandidate;
  let job;
  let internship;

  const applyJob = (identity, body = {}) =>
    request(app).post(`/api/applications/job/${job._id}`).set(auth(identity)).send(body);

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: "jp01-candidate@example.com" });
    otherCandidate = await createUserWithToken({ email: "jp01-other@example.com" });
    const employer = await createEmployerWithToken({ email: "jp01-employer@example.com" });
    const profile = await createEmployerProfile(employer.user._id);
    job = await createTestJob(profile._id, { createdBy: employer.user._id, employerId: profile._id });
    internship = await Internship.create({
      title: "JP-01 Internship",
      location: "Remote",
      description: "Resume requirement",
      employerId: profile._id,
      createdBy: employer.user._id,
      status: "Published",
    });
  });

  it("rejects a student without a resume with 400 and creates no application", async () => {
    const res = await applyJob(candidate);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: NO_RESUME });

    const internshipRes = await request(app)
      .post(`/api/applications/internship/${internship._id}`)
      .set(auth(candidate))
      .send({});
    expect(internshipRes.status).toBe(400);
    expect(internshipRes.body.message).toBe("Please upload your resume before applying for this internship.");

    // The internship endpoint also accepts job ids, so it can't be used to skip the check.
    const viaInternshipPath = await request(app)
      .post(`/api/applications/internship/${job._id}`)
      .set(auth(candidate))
      .send({});
    expect(viaInternshipPath.status).toBe(400);

    expect(await Application.countDocuments()).toBe(0);
    expect((await Job.findById(job._id).lean()).applicantsCount || 0).toBe(0);
  });

  it("lets a student with a saved resume apply and stores that resume", async () => {
    const resumeUrl = await giveTestResume(candidate.user);

    const res = await applyJob(candidate);

    expect(res.status).toBe(201);
    expect(res.body.application.resumeUrl).toBe(resumeUrl);
    expect(res.body.application.applicationData.resumeUrl).toBe(resumeUrl);
  });

  it("uses the resume saved on the student profile when the user record has none", async () => {
    const resumeUrl = await giveTestResume(candidate.user, { saveOnUser: false });
    await StudentProfile.create({ userId: candidate.user._id, resume: { resumeUrl, resumeName: "cv.pdf" } });

    const res = await applyJob(candidate);

    expect(res.status).toBe(201);
    expect(res.body.application.resumeUrl).toBe(resumeUrl);
  });

  it("accepts a pasted https resume link", async () => {
    const link = "https://drive.google.com/file/d/abc123/view";

    const res = await applyJob(candidate, { resumeUrl: link });

    expect(res.status).toBe(201);
    expect(res.body.application.resumeUrl).toBe(link);
  });

  it.each([
    ["an object", { url: "https://example.com/cv.pdf" }],
    ["an array", ["https://example.com/cv.pdf"]],
    ["a number", 42],
    ["not a URL", "my resume"],
    ["a javascript: link", "javascript:alert(1)"],
    ["an http link", "http://example.com/cv.pdf"],
    ["an unknown stored file", "https://res.cloudinary.com/test-cloud/raw/authenticated/v1/careerconnect/resumes/missing.pdf"],
    ["an over-long URL", `https://example.com/${"a".repeat(2100)}`],
  ])("rejects %s as the resume reference", async (_label, resumeUrl) => {
    await giveTestResume(candidate.user);

    const res = await applyJob(candidate, { resumeUrl });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: INVALID_RESUME });
    expect(await Application.countDocuments()).toBe(0);
  });

  it("treats an empty resume reference as missing", async () => {
    const res = await applyJob(candidate, { resumeUrl: "   " });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(NO_RESUME);
    expect(await Application.countDocuments()).toBe(0);
  });

  it("treats a saved resume whose file is gone as missing", async () => {
    const resumeUrl = await giveTestResume(candidate.user);
    await ResumeAsset.deleteOne({ url: resumeUrl });

    const res = await applyJob(candidate);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(NO_RESUME);
    expect(await Application.countDocuments()).toBe(0);
  });

  it("rejects another student's resume, even when the applicant has their own", async () => {
    await giveTestResume(candidate.user);
    const othersResume = await giveTestResume(otherCandidate.user);

    const viaBody = await applyJob(candidate, { resumeUrl: othersResume });
    const viaApplicationData = await applyJob(otherCandidate, { applicationData: { resumeUrl: "https://example.com/x.pdf" } });

    expect(viaBody.status).toBe(400);
    expect(viaBody.body.message).toBe(INVALID_RESUME);
    // applicationData can't replace the verified resume either.
    expect(viaApplicationData.status).toBe(201);
    expect(viaApplicationData.body.application.applicationData.resumeUrl).toBe(othersResume);
    expect(await Application.countDocuments({ candidateId: candidate.user._id })).toBe(0);
  });

  it("lets a student apply after uploading a resume through /api/resume/upload", async () => {
    const uploadStream = jest.spyOn(cloudinary.uploader, "upload_stream").mockImplementation((options, callback) => ({
      end: () => callback(null, {
        public_id: `${options.folder}/${options.public_id}`,
        secure_url: `https://res.cloudinary.com/test-cloud/raw/authenticated/v1/${options.folder}/${options.public_id}`,
      }),
    }));

    try {
      expect((await applyJob(candidate)).status).toBe(400);

      const upload = await request(app)
        .post("/api/resume/upload")
        .set(auth(candidate))
        .attach("resume", Buffer.from("%PDF-1.4 test resume"), { filename: "cv.pdf", contentType: "application/pdf" });
      expect(upload.status).toBe(200);

      const res = await applyJob(candidate);
      expect(res.status).toBe(201);
      expect(res.body.application.resumeUrl).toBe(upload.body.resumeUrl);
    } finally {
      uploadStream.mockRestore();
    }
  });

  it("creates one application when the same student applies concurrently", async () => {
    await giveTestResume(candidate.user);
    await Application.init(); // the unique (candidateId, jobId) index must exist

    const results = await Promise.all(Array.from({ length: 5 }, () => applyJob(candidate)));
    const statuses = results.map((res) => res.status).sort();

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(4);
    expect(await Application.countDocuments({ candidateId: candidate.user._id, jobId: job._id })).toBe(1);
  });

  it("still requires authentication", async () => {
    const res = await request(app)
      .post(`/api/applications/job/${job._id}`)
      .send({ resumeUrl: "https://example.com/cv.pdf" });

    expect(res.status).toBe(401);
    expect(await Application.countDocuments()).toBe(0);
  });
});
