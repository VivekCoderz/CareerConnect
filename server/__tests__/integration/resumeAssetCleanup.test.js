const request = require("supertest");
const app = require("../../app");
const ResumeAsset = require("../../models/ResumeAsset");
const Resume = require("../../models/Resume");
const Application = require("../../models/Application");
const { cloudinary } = require("../../config/cloudinary");
const { cleanupOrphanResumeAssets } = require("../../services/resumeAssetCleanup");
const { createUserWithToken } = require("../helpers/createTestUser");

const url = (name) => `https://res.cloudinary.com/demo/raw/authenticated/v1/careerconnect/resumes/${name}.pdf`;

const createAsset = async (userId, name, { ageMinutes = 60 } = {}) => {
  const asset = await ResumeAsset.create({ user: userId, publicId: `careerconnect/resumes/${name}`, url: url(name) });
  await ResumeAsset.collection.updateOne({ _id: asset._id }, { $set: { createdAt: new Date(Date.now() - ageMinutes * 60_000) } });
  return asset;
};

describe("resume file cleanup (G08)", () => {
  let destroy;
  beforeEach(() => {
    destroy = jest.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });
  });
  afterEach(() => jest.restoreAllMocks());

  it("deletes a user's resume file that nothing references", async () => {
    const { user } = await createUserWithToken({ email: "clean@student.test" });
    const asset = await createAsset(user._id, "orphan");

    expect(await cleanupOrphanResumeAssets(user._id)).toBe(1);
    expect(destroy).toHaveBeenCalledWith(asset.publicId, expect.objectContaining({ resource_type: "raw", type: "authenticated" }));
    expect(await ResumeAsset.exists({ _id: asset._id })).toBeNull();
  });

  it("keeps a file that a resume or an application still uses", async () => {
    const { user } = await createUserWithToken({ email: "keep@student.test" });
    await createAsset(user._id, "in-resume");
    await createAsset(user._id, "in-application");
    await Resume.create({ user: user._id, title: "Main", rawData: {}, resumeUrl: url("in-resume") });
    await Application.collection.insertOne({ candidateId: user._id, resumeUrl: url("in-application") });

    expect(await cleanupOrphanResumeAssets(user._id)).toBe(0);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("never deletes a file uploaded in the last 10 minutes", async () => {
    const { user } = await createUserWithToken({ email: "fresh@student.test" });
    await createAsset(user._id, "just-uploaded", { ageMinutes: 1 });

    expect(await cleanupOrphanResumeAssets(user._id)).toBe(0);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("only touches the given user's files", async () => {
    const { user } = await createUserWithToken({ email: "me@student.test" });
    const other = await createUserWithToken({ email: "other@student.test" });
    const othersAsset = await createAsset(other.user._id, "not-mine");

    await cleanupOrphanResumeAssets(user._id);

    expect(await ResumeAsset.exists({ _id: othersAsset._id })).not.toBeNull();
  });

  it("removes the old file in the background after a resume is deleted", async () => {
    const { user, token } = await createUserWithToken({ email: "delete@student.test" });
    const asset = await createAsset(user._id, "deleted-resume");
    const resume = await Resume.create({ user: user._id, title: "Old", rawData: {}, resumeUrl: url("deleted-resume") });

    const res = await request(app).delete(`/api/resume/${resume._id}`).set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);

    // Background work: allow up to 10 s on slow CI runners
    for (let i = 0; i < 100 && (await ResumeAsset.exists({ _id: asset._id })); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(await ResumeAsset.exists({ _id: asset._id })).toBeNull();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
