// C10: POST /api/programs/:slug/enquiry stores a ProgramEnquiry (status New) and returns a
// reference number; bad input, duplicates and floods are rejected.
const request = require("supertest");
const app = require("../../app");
const ProgramEnquiry = require("../../models/ProgramEnquiry");
const { programEnquiryStore } = require("../../middleware/rateLimitMiddleware");
const { createUserWithToken } = require("../helpers/createTestUser");

const SLUG = "full-stack-web-development";
const URL = `/api/programs/${SLUG}/enquiry`;

const validEnquiry = (overrides = {}) => ({
  name: "Asha Kumar",
  email: "asha.kumar@gmail.com",
  phone: "9876543210",
  countryCode: "+91",
  college: "Test College of Engineering",
  degree: "B.Tech",
  yearOfStudy: "3",
  city: "Pune",
  level: "foundation",
  message: "Interested in the weekend option.",
  acceptedTerms: true,
  termsVersion: "2026-10-01",
  ...overrides,
});

const send = (body) => request(app).post(URL).send(body);

beforeAll(() => ProgramEnquiry.init()); // the one-open-enquiry index must exist
beforeEach(() => programEnquiryStore.resetAll());

describe("POST /api/programs/:slug/enquiry (C10)", () => {
  it("stores a valid enquiry as New and returns a reference number", async () => {
    const res = await send(validEnquiry());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reference).toMatch(/^ENQ-[2-9A-HJ-NP-Z]{8}$/);

    const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
    expect(saved).toMatchObject({
      programSlug: SLUG,
      programTitle: "Full Stack Web Development",
      name: "Asha Kumar",
      email: "asha.kumar@gmail.com",
      countryCode: "+91",
      phone: "9876543210",
      college: "Test College of Engineering",
      degree: "B.Tech",
      yearOfStudy: "3",
      city: "Pune",
      level: "foundation",
      message: "Interested in the weekend option.",
      status: "New",
      user: null,
    });
    expect(saved.consent.termsVersion).toBe("2026-10-01");
    expect(saved.consent.acceptedAt).toBeInstanceOf(Date);
  });

  it("makes the message optional and normalises email and level", async () => {
    const res = await send(validEnquiry({ message: undefined, email: " Asha.Kumar@Gmail.com ", level: "Advanced" }));
    expect(res.status).toBe(201);
    const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
    expect(saved.message).toBe("");
    expect(saved.email).toBe("asha.kumar@gmail.com");
    expect(saved.level).toBe("advanced");
  });

  it("never stores batch, timing or other unknown fields", async () => {
    const res = await send(validEnquiry({ batch: "December", timing: "Evening", status: "Closed", user: "0123456789abcdef01234567" }));
    expect(res.status).toBe(201);
    const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
    expect(saved).not.toHaveProperty("batch");
    expect(saved).not.toHaveProperty("timing");
    expect(saved.status).toBe("New");
    expect(saved.user).toBeNull();
  });

  it("strips HTML from text fields", async () => {
    const res = await send(validEnquiry({ message: "<script>alert(1)</script>Call me after 5" }));
    expect(res.status).toBe(201);
    const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
    expect(saved.message).toBe("alert(1)Call me after 5");
  });

  describe("logged-in student", () => {
    it("links the account and fills blank fields from it", async () => {
      const { user, token } = await createUserWithToken({ email: "logged.in@gmail.com", phone: "9123456780" });
      const res = await request(app)
        .post(URL)
        .set("Authorization", `Bearer ${token}`)
        .send(validEnquiry({ name: "", email: "", phone: "", countryCode: "", college: "", degree: "", city: "" }));
      expect(res.status).toBe(201);
      const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
      expect(saved.user.toString()).toBe(user._id.toString());
      expect(saved).toMatchObject({
        name: user.fullName,
        email: "logged.in@gmail.com",
        phone: "9123456780",
        countryCode: "+91",
        college: user.college,
        degree: user.course,
        city: user.city,
      });
    });

    it("keeps what the student typed over the account", async () => {
      const { token } = await createUserWithToken({ email: "typed.over@gmail.com" });
      const res = await request(app).post(URL).set("Authorization", `Bearer ${token}`).send(validEnquiry({ city: "Nagpur" }));
      expect(res.status).toBe(201);
      const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
      expect(saved.city).toBe("Nagpur");
      expect(saved.email).toBe("asha.kumar@gmail.com");
    });

    it("treats a bad token as a visitor instead of failing", async () => {
      const res = await request(app).post(URL).set("Authorization", "Bearer not-a-token").send(validEnquiry());
      expect(res.status).toBe(201);
      const saved = await ProgramEnquiry.findOne({ reference: res.body.reference }).lean();
      expect(saved.user).toBeNull();
    });
  });

  describe("bad input", () => {
    it.each([
      ["name", { name: "A" }],
      ["name", { name: "x".repeat(51) }],
      ["name", { name: { $gt: "" } }],
      ["email", { email: "not-an-email" }],
      ["email", { email: "someone@mailinator.com" }],
      ["phone", { phone: "12345" }],
      ["phone", { phone: "5876543210" }],
      ["countryCode", { countryCode: "91" }],
      ["college", { college: "" }],
      ["degree", { degree: "" }],
      ["yearOfStudy", { yearOfStudy: "7" }],
      ["yearOfStudy", { yearOfStudy: undefined }],
      ["city", { city: "" }],
      ["level", { level: "expert" }],
      ["level", { level: undefined }],
      ["message", { message: "x".repeat(501) }],
      ["message", { message: ["array"] }],
      ["acceptedTerms", { acceptedTerms: false }],
      ["acceptedTerms", { acceptedTerms: "true" }],
      ["acceptedTerms", { termsVersion: "" }],
    ])("rejects a bad %s (%j) with 400 and stores nothing", async (field, overrides) => {
      const res = await send(validEnquiry(overrides));
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.field).toBe(field);
      expect(res.body.message).toEqual(expect.any(String));
      expect(await ProgramEnquiry.countDocuments()).toBe(0);
    });

    it.each(["no-such-programme", "__proto__"])("404s for an unknown programme (%s)", async (slug) => {
      const res = await request(app).post(`/api/programs/${slug}/enquiry`).send(validEnquiry());
      expect(res.status).toBe(404);
      expect(await ProgramEnquiry.countDocuments()).toBe(0);
    });
  });

  describe("one open enquiry per email per programme", () => {
    it("rejects a second open enquiry with 409, whatever the email's case", async () => {
      expect((await send(validEnquiry())).status).toBe(201);
      const res = await send(validEnquiry({ email: "ASHA.KUMAR@gmail.com", name: "Someone Else" }));
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ success: false, code: "ENQUIRY_EXISTS", field: "email" });
      expect(await ProgramEnquiry.countDocuments()).toBe(1);
    });

    it("lets only one of two enquiries sent at the same time through", async () => {
      const results = await Promise.all([send(validEnquiry()), send(validEnquiry())]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await ProgramEnquiry.countDocuments()).toBe(1);
    });

    it("allows the same email for a different programme", async () => {
      expect((await send(validEnquiry())).status).toBe(201);
      const res = await request(app).post("/api/programs/ai-generative-ai/enquiry").send(validEnquiry());
      expect(res.status).toBe(201);
    });

    it("allows a new enquiry once the old one is closed", async () => {
      const first = await send(validEnquiry());
      await ProgramEnquiry.updateOne({ reference: first.body.reference }, { status: "Closed" });
      const res = await send(validEnquiry());
      expect(res.status).toBe(201);
      expect(res.body.reference).not.toBe(first.body.reference);
    });

    it("still blocks a new enquiry while the old one is Contacted", async () => {
      const first = await send(validEnquiry());
      await ProgramEnquiry.updateOne({ reference: first.body.reference }, { status: "Contacted" });
      expect((await send(validEnquiry())).status).toBe(409);
    });
  });

  describe("floods", () => {
    const saved = process.env.RATE_LIMIT_PROGRAM_ENQUIRY_MAX;
    afterEach(() => {
      if (saved === undefined) delete process.env.RATE_LIMIT_PROGRAM_ENQUIRY_MAX;
      else process.env.RATE_LIMIT_PROGRAM_ENQUIRY_MAX = saved;
    });

    it("allows 5 enquiries an hour from one IP by default, then answers 429", async () => {
      delete process.env.RATE_LIMIT_PROGRAM_ENQUIRY_MAX;
      for (let i = 0; i < 5; i += 1) {
        const res = await send(validEnquiry({ email: `flood${i}@gmail.com` }));
        expect(res.status).toBe(201);
      }
      const res = await send(validEnquiry({ email: "flood5@gmail.com" }));
      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({ success: false, code: "ENQUIRY_RATE_LIMIT" });
      expect(await ProgramEnquiry.countDocuments()).toBe(5);
    });

    it("counts rejected attempts too, so bad input can't be used to probe without limit", async () => {
      process.env.RATE_LIMIT_PROGRAM_ENQUIRY_MAX = "2";
      expect((await send(validEnquiry({ name: "" }))).status).toBe(400);
      expect((await send(validEnquiry({ name: "" }))).status).toBe(400);
      expect((await send(validEnquiry())).status).toBe(429);
    });
  });

  describe("reCAPTCHA (production)", () => {
    const env = { NODE_ENV: process.env.NODE_ENV, RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY };
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    });
    afterEach(() => {
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it("requires a captcha token like signup", async () => {
      const res = await send(validEnquiry());
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/human verification/i);
      expect(await ProgramEnquiry.countDocuments()).toBe(0);
    });

    it("still 404s an unknown programme before calling reCAPTCHA", async () => {
      const res = await request(app).post("/api/programs/no-such-programme/enquiry").send(validEnquiry());
      expect(res.status).toBe(404);
    });
  });
});
