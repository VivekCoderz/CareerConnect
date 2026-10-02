const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Resume = require("../../models/Resume");
const ResumeAsset = require("../../models/ResumeAsset");
const Application = require("../../models/Application");
const Interview = require("../../models/Interview");
const Job = require("../../models/Job");
const EmployerProfile = require("../../models/EmployerProfile");
const StudentProfile = require("../../models/StudentProfile");
const Notification = require("../../models/Notification");
const { cloudinary } = require("../../config/cloudinary");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const deleteAccount = (token, body) =>
  request(app).delete("/api/auth/account").set("Authorization", `Bearer ${token}`).send(body);

const waitFor = async (check) => {
  for (let i = 0; i < 40 && !(await check()); i++) await new Promise((r) => setTimeout(r, 50));
};

describe("account deletion (G07)", () => {
  let destroy;
  beforeEach(() => {
    destroy = jest.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });
  });
  afterEach(() => jest.restoreAllMocks());

  const setupCandidate = async () => {
    const candidate = await createUserWithToken({ email: "leaving@student.test", phone: "9000000009" });
    const employer = await createEmployerWithToken({ email: "hr@acme.test" });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme Labs" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id });
    const resumeUrl = "https://res.cloudinary.com/demo/raw/authenticated/v1/careerconnect/resumes/leaving.pdf";
    await StudentProfile.create({ userId: candidate.user._id });
    await Resume.create({ user: candidate.user._id, title: "Main", rawData: {}, resumeUrl });
    await ResumeAsset.create({ user: candidate.user._id, publicId: "careerconnect/resumes/leaving", url: resumeUrl });
    const { insertedIds } = await Application.collection.insertMany([
      { candidateId: candidate.user._id, jobId: job._id, employerId: profile._id, status: "Applied",
        studentName: "Leaving Student", studentEmail: "leaving@student.test", studentPhone: "9000000009", resumeUrl },
      { candidateId: candidate.user._id, jobId: job._id, employerId: profile._id, status: "Hired",
        studentName: "Leaving Student", studentEmail: "leaving@student.test", resumeUrl },
    ]);
    const interview = await Interview.create({
      employerId: profile._id, candidateId: candidate.user._id, jobId: job._id,
      applicationId: insertedIds[0], scheduledDate: "2028-01-02", status: "scheduled",
    });
    await Notification.collection.insertOne({ recipient: candidate.user._id, title: "Hello", message: "Hi" });
    return { candidate, profile, job, insertedIds, interview };
  };

  it("refuses with a wrong password and changes nothing", async () => {
    const { candidate } = await setupCandidate();

    const res = await deleteAccount(candidate.token, { password: "Wrong@123" });

    expect(res.statusCode).toBe(401);
    expect(await User.exists({ _id: candidate.user._id })).not.toBeNull();
    expect(await Resume.countDocuments({ user: candidate.user._id })).toBe(1);
  });

  it("deletes a candidate's personal data and anonymises what employers keep", async () => {
    const { candidate, insertedIds, interview } = await setupCandidate();

    const res = await deleteAccount(candidate.token, { password: "Password@123" });

    expect(res.statusCode).toBe(200);
    expect(await User.exists({ _id: candidate.user._id })).toBeNull();
    expect(await StudentProfile.exists({ userId: candidate.user._id })).toBeNull();
    expect(await Resume.countDocuments({ user: candidate.user._id })).toBe(0);
    expect(await Notification.countDocuments({ recipient: candidate.user._id })).toBe(0);

    const active = await Application.findById(insertedIds[0]).lean();
    expect(active.status).toBe("Withdrawn");
    expect(active.studentEmail).toBe("");
    expect(active.studentPhone).toBe("");
    expect(active.resumeUrl).toBe("");
    const hired = await Application.findById(insertedIds[1]).lean();
    expect(hired.status).toBe("Hired");
    expect(hired.studentEmail).toBe("");

    expect((await Interview.findById(interview._id).lean()).status).toBe("cancelled");

    await waitFor(async () => !(await ResumeAsset.exists({ user: candidate.user._id })));
    expect(destroy).toHaveBeenCalledWith("careerconnect/resumes/leaving", expect.any(Object));

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${candidate.token}`);
    expect(me.statusCode).toBe(401);
  });

  it("asks Google-only accounts to type DELETE", async () => {
    const google = await createUserWithToken({ email: "google@student.test" });
    await User.collection.updateOne({ _id: google.user._id }, { $unset: { password: "" } });

    expect((await deleteAccount(google.token, {})).statusCode).toBe(400);
    expect((await deleteAccount(google.token, { confirm: "DELETE" })).statusCode).toBe(200);
    expect(await User.exists({ _id: google.user._id })).toBeNull();
  });

  it("closes an employer's listings but keeps the company profile", async () => {
    const employer = await createEmployerWithToken({ email: "closing@acme.test" });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Closing Co" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });

    const res = await deleteAccount(employer.token, { password: "Password@123" });

    expect(res.statusCode).toBe(200);
    expect((await Job.findById(job._id).lean()).status).toBe("Closed");
    expect(await EmployerProfile.exists({ _id: profile._id })).not.toBeNull();
    expect(await User.exists({ _id: employer.user._id })).toBeNull();
  });

  it("does not let an admin delete their own account here", async () => {
    const admin = await createUserWithToken({ email: "root@careerconnect.test", role: "SUPER_ADMIN", userType: "admin" });

    const res = await deleteAccount(admin.token, { password: "Password@123" });

    expect(res.statusCode).toBe(403);
    expect(await User.exists({ _id: admin.user._id })).not.toBeNull();
  });
});
