const request = require("supertest");
const app = require("../../app");
const ResumeAsset = require("../../models/ResumeAsset");
const Application = require("../../models/Application");
const Company = require("../../models/Company");
const { cloudinary } = require("../../config/cloudinary");
const { createUserWithToken } = require("../helpers/createTestUser");

const url = "https://res.cloudinary.com/demo/raw/authenticated/v1/careerconnect/resumes/cand.pdf";
const download = (token) =>
  request(app).get("/api/resume/download").query({ url }).set("Authorization", `Bearer ${token}`).redirects(0);

describe("resume uploads are PDF only (G10)", () => {
  it("rejects a Word document with a clear message", async () => {
    const { token } = await createUserWithToken({ email: "docx@student.test" });

    const res = await request(app)
      .post("/api/resume/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("resume", Buffer.from("PK\u0003\u0004 fake docx"), {
        filename: "resume.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/PDF/);
  });
});

describe("resume access for admins (G10)", () => {
  // CI has no Cloudinary credentials; sign URLs with a stub like resumeAccess.test.js does.
  let signedUrl;
  beforeEach(() => {
    signedUrl = jest.spyOn(cloudinary.utils, "private_download_url").mockReturnValue("https://api.cloudinary.com/test-signed-download");
  });
  afterEach(() => signedUrl.mockRestore());

  const setup = async () => {
    const candidate = await createUserWithToken({ email: "cand@student.test" });
    await ResumeAsset.create({ user: candidate.user._id, publicId: "careerconnect/resumes/cand.pdf", url });
    const company = await Company.create({ name: "Acme Labs", email: "hr@acme.test", status: "active" });
    const other = await Company.create({ name: "Other Co", email: "hr@other.test", status: "active" });
    await Application.collection.insertOne({ candidateId: candidate.user._id, companyId: company._id, resumeUrl: url });
    return { candidate, company, other };
  };

  it("lets a Super Admin open any resume", async () => {
    await setup();
    const admin = await createUserWithToken({ email: "root@careerconnect.test", role: "SUPER_ADMIN", userType: "admin" });

    expect((await download(admin.token)).statusCode).toBe(302);
  });

  it("lets a Company Admin open a resume sent to their company only", async () => {
    const { company, other } = await setup();
    const own = await createUserWithToken({ email: "admin@acme.test", role: "COMPANY_ADMIN", userType: "admin", companyId: company._id });
    const foreign = await createUserWithToken({ email: "admin@other.test", role: "COMPANY_ADMIN", userType: "admin", companyId: other._id });

    expect((await download(own.token)).statusCode).toBe(302);
    expect((await download(foreign.token)).statusCode).toBe(403);
  });
});
