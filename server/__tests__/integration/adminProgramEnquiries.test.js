// C11: admin list / status update / CSV export of programme enquiries, and the two emails
// sent for every new enquiry (admin summary + student confirmation).
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const request = require("supertest");
const app = require("../../app");
const sendEmail = require("../../utils/sendEmail");
const ProgramEnquiry = require("../../models/ProgramEnquiry");
const { programEnquiryStore } = require("../../middleware/rateLimitMiddleware");
const { flushNotificationEmails } = require("../../services/notificationEmail");
const { DEFAULT_ADMIN_EMAIL } = require("../../services/programEnquiryEmails");
const { csvCell } = require("../../controllers/adminProgramEnquiryController");
const { createUserWithToken } = require("../helpers/createTestUser");

const BASE = "/api/admin/program-enquiries";
let seq = 0;
const uniq = (label) => `${label}${Date.now()}${++seq}`;
const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

const superAdmin = () => createUserWithToken({ email: `${uniq("root")}@gmail.com`, role: "SUPER_ADMIN", userType: "admin" });

let refSeq = 0;
const enquiry = (overrides = {}) =>
  ProgramEnquiry.create({
    reference: `ENQ-TEST${String(++refSeq).padStart(4, "0")}`,
    programSlug: "full-stack-web-development",
    programTitle: "Full Stack Web Development",
    name: "Asha Kumar",
    email: `${uniq("asha")}@gmail.com`,
    countryCode: "+91",
    phone: "9876543210",
    college: "Test College of Engineering",
    degree: "B.Tech",
    yearOfStudy: "3",
    city: "Pune",
    level: "foundation",
    message: "",
    consent: { termsVersion: "2026-10-01", acceptedAt: new Date() },
    ...overrides,
  });

beforeAll(() => ProgramEnquiry.init());
beforeEach(() => {
  sendEmail.mockClear();
  programEnquiryStore.resetAll();
});

describe("admin only (C11)", () => {
  const routes = [
    ["get", BASE],
    ["get", `${BASE}/export.csv`],
    ["patch", `${BASE}/0123456789abcdef01234567`],
  ];

  it.each(routes)("%s %s needs a login (401)", async (method, path) => {
    const res = await request(app)[method](path).send({ status: "Contacted" });
    expect(res.status).toBe(401);
  });

  it.each(routes)("%s %s refuses a student (403)", async (method, path) => {
    const { token } = await createUserWithToken({ email: `${uniq("student")}@gmail.com` });
    const res = await as(token, method, path).send({ status: "Contacted" });
    expect(res.status).toBe(403);
  });

  it.each(routes)("%s %s refuses an employer (403)", async (method, path) => {
    const { token } = await createUserWithToken({ email: `${uniq("hr")}@gmail.com`, role: "employer", userType: "employer" });
    const res = await as(token, method, path).send({ status: "Contacted" });
    expect(res.status).toBe(403);
  });

  it.each(routes)("%s %s refuses an organisation's COMPANY_ADMIN (403)", async (method, path) => {
    const { token } = await createUserWithToken({ email: `${uniq("orgadmin")}@gmail.com`, role: "COMPANY_ADMIN", userType: "admin" });
    const res = await as(token, method, path).send({ status: "Contacted" });
    expect(res.status).toBe(403);
  });

  it("lets a SUPER_ADMIN in", async () => {
    const { token } = await superAdmin();
    expect((await as(token, "get", BASE)).status).toBe(200);
    expect((await as(token, "get", `${BASE}/export.csv`)).status).toBe(200);
  });
});

describe("GET /api/admin/program-enquiries", () => {
  let token;
  beforeEach(async () => {
    ({ token } = await superAdmin());
    await enquiry({ name: "Ravi Shah", email: "ravi.shah@gmail.com", phone: "9123456789", city: "Mumbai", createdAt: new Date("2026-11-20T10:00:00+05:30") });
    await enquiry({ name: "Meera Iyer", status: "Contacted", createdAt: new Date("2026-11-22T23:30:00+05:30") });
    await enquiry({
      name: "Kabir Das", programSlug: "ai-generative-ai", programTitle: "AI & Generative AI",
      status: "Enrolled", createdAt: new Date("2026-11-25T00:15:00+05:30"),
    });
  });

  const names = (res) => res.body.data.enquiries.map((e) => e.name);

  it("lists newest first with status counts and paging", async () => {
    const res = await as(token, "get", BASE);
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["Kabir Das", "Meera Iyer", "Ravi Shah"]);
    expect(res.body.data.statusCounts).toEqual({ New: 1, Contacted: 1, Enrolled: 1, "Not interested": 0 });
    expect(res.body.data.statuses).toEqual(["New", "Contacted", "Enrolled", "Not interested"]);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 50, total: 3, pages: 1 });
  });

  it("pages", async () => {
    const res = await as(token, "get", `${BASE}?limit=2&page=2`);
    expect(names(res)).toEqual(["Ravi Shah"]);
    expect(res.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });

  it("filters by programme", async () => {
    expect(names(await as(token, "get", `${BASE}?program=ai-generative-ai`))).toEqual(["Kabir Das"]);
  });

  it("filters by status, keeping the counts for the other tabs", async () => {
    const res = await as(token, "get", `${BASE}?status=Contacted`);
    expect(names(res)).toEqual(["Meera Iyer"]);
    expect(res.body.data.statusCounts.New).toBe(1);
  });

  it("filters by date in India time, both days included", async () => {
    expect(names(await as(token, "get", `${BASE}?from=2026-11-21&to=2026-11-22`))).toEqual(["Meera Iyer"]);
    expect(names(await as(token, "get", `${BASE}?from=2026-11-25`))).toEqual(["Kabir Das"]);
    expect(names(await as(token, "get", `${BASE}?to=2026-11-20`))).toEqual(["Ravi Shah"]);
  });

  it.each([
    ["name", "ravi"],
    ["email", "RAVI.SHAH@"],
    ["mobile", "91234"],
    ["city", "mumbai"],
  ])("searches by %s", async (_label, search) => {
    expect(names(await as(token, "get", `${BASE}?search=${encodeURIComponent(search)}`))).toEqual(["Ravi Shah"]);
  });

  it("searches by reference and treats regex characters as text", async () => {
    const ravi = await ProgramEnquiry.findOne({ name: "Ravi Shah" });
    expect(names(await as(token, "get", `${BASE}?search=${ravi.reference.toLowerCase()}`))).toEqual(["Ravi Shah"]);
    expect(names(await as(token, "get", `${BASE}?search=${encodeURIComponent(".*")}`))).toEqual([]);
  });

  it.each([
    ["status", "status=Closed"],
    ["from", "from=26-11-2026"],
    ["from", "from=2026-02-31"],
    ["to", "from=2026-11-25&to=2026-11-20"],
  ])("rejects a bad %s filter (%s)", async (field, qs) => {
    const res = await as(token, "get", `${BASE}?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
  });
});

describe("PATCH /api/admin/program-enquiries/:id", () => {
  let admin;
  let token;
  beforeEach(async () => {
    admin = await superAdmin();
    ({ token } = admin);
  });

  it("updates the status and records who did it, when, and the note", async () => {
    const e = await enquiry();
    const res = await as(token, "patch", `${BASE}/${e._id}`).send({ status: "Contacted", note: "Called, will decide by Friday." });
    expect(res.status).toBe(200);
    expect(res.body.data.enquiry.status).toBe("Contacted");

    const saved = await ProgramEnquiry.findById(e._id).lean();
    expect(saved.status).toBe("Contacted");
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0]).toMatchObject({ from: "New", to: "Contacted", note: "Called, will decide by Friday." });
    expect(saved.history[0].by.toString()).toBe(admin.user._id.toString());
    expect(saved.history[0].at).toBeInstanceOf(Date);
  });

  it.each(["New", "Contacted", "Enrolled", "Not interested"])("accepts %s", async (status) => {
    const e = await enquiry({ status: status === "New" ? "Contacted" : "New" });
    expect((await as(token, "patch", `${BASE}/${e._id}`).send({ status })).status).toBe(200);
  });

  it("adds a note without changing the status", async () => {
    const e = await enquiry({ status: "Contacted" });
    const res = await as(token, "patch", `${BASE}/${e._id}`).send({ status: "Contacted", note: "No answer, try again." });
    expect(res.status).toBe(200);
    const saved = await ProgramEnquiry.findById(e._id).lean();
    expect(saved.history[0]).toMatchObject({ from: "Contacted", to: "Contacted", note: "No answer, try again." });
  });

  it.each([
    ["status", { status: "Closed" }],
    ["status", {}],
    ["note", { status: "Contacted", note: "x".repeat(1001) }],
    ["note", { status: "Contacted", note: { $set: "x" } }],
  ])("rejects a bad %s", async (field, body) => {
    const e = await enquiry();
    const res = await as(token, "patch", `${BASE}/${e._id}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
    expect((await ProgramEnquiry.findById(e._id).lean()).history).toHaveLength(0);
  });

  it("rejects a no-op (same status, no note)", async () => {
    const e = await enquiry();
    expect((await as(token, "patch", `${BASE}/${e._id}`).send({ status: "New" })).status).toBe(400);
  });

  it.each(["0123456789abcdef01234567", "not-an-id"])("404s for an unknown id (%s)", async (id) => {
    expect((await as(token, "patch", `${BASE}/${id}`).send({ status: "Contacted" })).status).toBe(404);
  });

  it("won't reopen an enquiry while the same email has another open one for the programme", async () => {
    const old = await enquiry({ email: "twice@gmail.com", status: "Not interested" });
    await enquiry({ email: "twice@gmail.com" });
    const res = await as(token, "patch", `${BASE}/${old._id}`).send({ status: "Contacted" });
    expect(res.status).toBe(409);
    expect((await ProgramEnquiry.findById(old._id).lean()).status).toBe("Not interested");
  });

  it("does not email the student about admin status changes or notes", async () => {
    const e = await enquiry();
    await as(token, "patch", `${BASE}/${e._id}`).send({ status: "Enrolled", note: "Paid." });
    await flushNotificationEmails();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/program-enquiries/export.csv", () => {
  let token;
  beforeEach(async () => {
    ({ token } = await superAdmin());
  });

  const getCsv = (qs = "") => as(token, "get", `${BASE}/export.csv${qs}`).buffer(true).parse((res, cb) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => cb(null, Buffer.concat(chunks)));
  });

  it("downloads a UTF-8 CSV that Excel opens: BOM, CRLF, quoted cells, a header row", async () => {
    const e = await enquiry({
      name: "Ananya \"Annie\" Rao",
      message: "Line one, with a comma\nLine two",
      city: "Bengaluru – South",
      createdAt: new Date("2026-11-26T14:05:00+05:30"),
    });
    await ProgramEnquiry.updateOne({ _id: e._id }, { $push: { history: { from: "New", to: "Contacted", note: "Call back Monday", by: e._id } } });

    const res = await getCsv();
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="programme-enquiries-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers["cache-control"]).toBe("no-store");

    const bytes = res.body;
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const csv = bytes.toString("utf8").slice(1);
    expect(csv.endsWith("\r\n")).toBe(true);

    const [header, row] = csv.split("\r\n");
    expect(header).toBe(
      '"Reference","Received (IST)","Programme","Status","Name","Email","Mobile","College","Degree","Year of study",' +
        '"City","Preferred level","Message","Logged in","Latest note","Last updated (IST)"'
    );
    expect(row).toContain(`"${e.reference}","2026-11-26 14:05","Full Stack Web Development","New"`);
    expect(row).toContain('"Ananya ""Annie"" Rao"');
    expect(row).toContain('"(+91) 9876543210"');
    expect(row).toContain('"3rd year","Bengaluru – South","Foundation","Line one, with a comma\nLine two","No","Call back Monday"');
  });

  it("uses the same filters as the list", async () => {
    await enquiry({ name: "Wanted Person", status: "Enrolled" });
    await enquiry({ name: "Other Person" });
    const csv = (await getCsv("?status=Enrolled")).body.toString("utf8");
    expect(csv).toContain("Wanted Person");
    expect(csv).not.toContain("Other Person");
    expect(csv.trim().split("\r\n")).toHaveLength(2);
  });

  it("gives just the header row when nothing matches", async () => {
    const csv = (await getCsv("?status=Enrolled")).body.toString("utf8");
    expect(csv.trim().split("\r\n")).toHaveLength(1);
  });

  it("stops Excel running student text as a formula", async () => {
    await enquiry({ name: "=HYPERLINK(\"http://evil.test\",\"x\")", college: "+cmd|' /C calc'!A0", city: "@SUM(1)", message: "-2+3" });
    const csv = (await getCsv()).body.toString("utf8");
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.test"",""x"")"');
    expect(csv).toContain('"\'+cmd|\' /C calc\'!A0"');
    expect(csv).toContain('"\'@SUM(1)"');
    expect(csv).toContain('"\'-2+3"');
    expect(csvCell("Pune")).toBe('"Pune"');
  });

  it("rejects bad filters with 400", async () => {
    expect((await getCsv("?from=yesterday")).status).toBe(400);
  });
});

describe("emails for a new enquiry (C11)", () => {
  const ORIGINAL = process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL;
    else process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL = ORIGINAL;
  });

  const submit = (overrides = {}) =>
    request(app).post("/api/programs/full-stack-web-development/enquiry").send({
      name: "Asha Kumar",
      email: "asha.emails@gmail.com",
      phone: "9876543210",
      countryCode: "+91",
      college: "Test College <b>of</b> Engineering",
      degree: "B.Tech",
      yearOfStudy: "graduated",
      city: "Pune",
      level: "professional",
      message: "Weekend batches?",
      acceptedTerms: true,
      termsVersion: "2026-10-01",
      ...overrides,
    });

  const emailTo = (to) => sendEmail.mock.calls.map(([opts]) => opts).find((opts) => opts.to === to);

  it("emails the admin a summary with a link to the admin page", async () => {
    process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL = "leads@e2job.com";
    const res = await submit();
    expect(res.status).toBe(201);
    await flushNotificationEmails();

    const mail = emailTo("leads@e2job.com");
    expect(mail).toBeDefined();
    expect(mail.subject).toBe(`New programme enquiry: Full Stack Web Development (${res.body.reference})`);
    for (const part of [
      "Asha Kumar", "asha.emails@gmail.com", "+91 9876543210", "Test College of Engineering",
      "B.Tech (Graduated)", "Pune", "Preferred level: Professional", "Weekend batches?", res.body.reference,
    ]) {
      expect(mail.text).toContain(part);
    }
    expect(mail.text).toContain(`/admin/program-enquiries?ref=${res.body.reference}`);
    expect(mail.html).toContain(`/admin/program-enquiries?ref=${res.body.reference}`);
  });

  it("emails the student a confirmation that the team will call with trainer, timings and fees", async () => {
    const res = await submit();
    await flushNotificationEmails();

    const mail = emailTo("asha.emails@gmail.com");
    expect(mail).toBeDefined();
    expect(mail.subject).toBe("We've got your enquiry for Full Stack Web Development");
    expect(mail.text).toContain("Hi Asha Kumar,");
    expect(mail.text).toContain(res.body.reference);
    expect(mail.text).toMatch(/our team will contact you soon with the trainer, timings and fees/i);
    expect(mail.text).toContain("/programs/full-stack-web-development");
    // The student's email carries no admin link and none of the other details.
    expect(mail.text).not.toContain("/admin/");
  });

  it("sends to the support address when no admin address is set", async () => {
    delete process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL;
    await submit();
    await flushNotificationEmails();
    expect(emailTo(DEFAULT_ADMIN_EMAIL)).toBeDefined();
  });

  it("escapes student text in the HTML email", async () => {
    process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL = "leads@e2job.com";
    await submit({ message: "Tom & Jerry \"quotes\"" });
    await flushNotificationEmails();
    expect(emailTo("leads@e2job.com").html).toContain("Tom &amp; Jerry &quot;quotes&quot;");
  });

  it("sends nothing for a rejected enquiry", async () => {
    await submit({ level: "expert" });
    await flushNotificationEmails();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still stores the enquiry and answers 201 when the email provider fails", async () => {
    sendEmail.mockResolvedValueOnce({ error: "Brevo down" }).mockRejectedValueOnce(new Error("network"));
    const res = await submit();
    expect(res.status).toBe(201);
    await flushNotificationEmails();
    expect(await ProgramEnquiry.countDocuments({ reference: res.body.reference })).toBe(1);
  });
});
