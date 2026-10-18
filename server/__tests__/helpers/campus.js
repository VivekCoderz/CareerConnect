// Shared set-up for the campus portal tests. Requiring this file turns the module on, so it must
// be required before ../../app.
process.env.ENABLE_CAMPUS = "true";
process.env.CAMPUS_DEV_LOGIN = "true";

const request = require("supertest");
const app = require("../../app");
const Institution = require("../../campus/models/Institution");
const CampusAssessment = require("../../campus/models/CampusAssessment");
const Batch = require("../../campus/models/Batch");
const { createUserWithToken } = require("./createTestUser");

let seq = 0;
const uniq = (label) => `${label}${Date.now()}${++seq}`;

const createInstitution = (overrides = {}) =>
  Institution.create({
    slug: uniq("uni"),
    name: "Fake University",
    domains: [],
    allowedEmailDomains: ["fakeuni.test"],
    ...overrides,
  });

const api = (institution) => {
  const call = (method, path, token) => {
    const r = request(app)[method](`/api/campus${path}`).set("X-Campus-Tenant", institution.slug);
    return token ? r.set("Authorization", `Bearer ${token}`) : r;
  };
  return {
    get: (p, t) => call("get", p, t),
    post: (p, t) => call("post", p, t),
    put: (p, t) => call("put", p, t),
    patch: (p, t) => call("patch", p, t),
    delete: (p, t) => call("delete", p, t),
  };
};

const createAdmin = () => createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });

const csv = (rows) => Buffer.from(["name,email,roll no,cgpa,phone", ...rows.map((r) => r.join(","))].join("\n"));

/** Imports students through the real endpoint and returns the batch. */
const importStudents = async (institution, adminToken, rows, batchName = "MBA 2025-27") => {
  const res = await api(institution)
    .post("/ops/import/commit", adminToken)
    .field("batchName", batchName)
    .attach("file", csv(rows), "students.csv");
  if (res.status !== 200) throw new Error(`import failed: ${res.status} ${JSON.stringify(res.body)}`);
  return Batch.findById(res.body.batch.id);
};

/** Signs in with the QA-only dev login and accepts the notice. */
const signIn = async (institution, email, { consent = true } = {}) => {
  const res = await api(institution).post("/auth/dev").send({ email });
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (consent) await api(institution).post("/consent", res.body.token).send({ accepted: true });
  return res.body.token;
};

/** A small assessment: 3 multiple choice, 1 written, 1 speaking. */
const createAssessment = (institution, batch, overrides = {}) =>
  CampusAssessment.create({
    institutionId: institution._id,
    batchId: batch._id,
    title: "Fake Assessment",
    opensAt: new Date(Date.now() - 60 * 1000),
    closesAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    timeLimitMinutes: 60,
    sections: [{ key: "quant", title: "Quant" }, { key: "written", title: "Scenarios" }, { key: "speaking", title: "Speaking" }],
    questions: [
      { id: "q1", section: "quant", type: "mcq", prompt: "2+2?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }], correctOptionId: "b", points: 1 },
      { id: "q2", section: "quant", type: "mcq", prompt: "3+3?", options: [{ id: "a", text: "6" }, { id: "b", text: "7" }], correctOptionId: "a", points: 1 },
      { id: "q3", section: "quant", type: "mcq", prompt: "5-1?", options: [{ id: "a", text: "4" }, { id: "b", text: "5" }], correctOptionId: "a", points: 1 },
      { id: "q4", section: "written", type: "written", prompt: "Fake scenario", rubric: "Fake rubric", points: 10 },
      { id: "q5", section: "speaking", type: "speaking", prompt: "Fake speaking", rubric: "Fake rubric", points: 10, maxSeconds: 90 },
    ],
    ...overrides,
  });

module.exports = { app, api, uniq, createInstitution, createAdmin, importStudents, signIn, createAssessment, csv };
