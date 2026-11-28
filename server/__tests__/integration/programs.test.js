// C09: GET /api/programs and GET /api/programs/:slug serve the C05 programme data files.
const fs = require("fs");
const os = require("os");
const path = require("path");
const request = require("supertest");
const app = require("../../app");
const { loadPrograms, reloadPrograms, CARD_FIELDS, DETAIL_FIELDS } = require("../../services/programCatalog");
const { PROGRAMS_CACHE_CONTROL } = require("../../routes/programRoutes");

const FIXTURES = path.join(__dirname, "../fixtures/programs");
const CLIENT_LIST = path.join(__dirname, "../../../client/src/pages/programs/programList.js");

describe("programme API with the real C05 data files", () => {
  beforeAll(() => reloadPrograms());

  it("lists the published programmes with card fields and public caching", async () => {
    const res = await request(app).get("/api/programs");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe(PROGRAMS_CACHE_CONTROL);
    expect(res.body.success).toBe(true);
    expect(res.body.programs.length).toBeGreaterThan(0);
    for (const program of res.body.programs) {
      expect(Object.keys(program).sort()).toEqual([...CARD_FIELDS].sort());
    }
  });

  it("uses the same slugs as the client's programme cards (C12)", async () => {
    const res = await request(app).get("/api/programs");
    const clientSlugs = [...fs.readFileSync(CLIENT_LIST, "utf8").matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(res.body.programs.map((p) => p.slug)).toEqual(clientSlugs);
  });

  it("returns every published programme's full detail", async () => {
    const list = (await request(app).get("/api/programs")).body.programs;
    for (const card of list) {
      const res = await request(app).get(`/api/programs/${card.slug}`);
      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe(PROGRAMS_CACHE_CONTROL);
      expect(Object.keys(res.body.program).sort()).toEqual([...DETAIL_FIELDS].sort());
      expect(res.body.program).toMatchObject(card);
    }
  });
});

describe("programme API (fixture data)", () => {
  beforeAll(() => reloadPrograms(FIXTURES));
  afterAll(() => reloadPrograms());

  it("lists only published programmes, in order, without the content sections", async () => {
    const res = await request(app).get("/api/programs");
    expect(res.status).toBe(200);
    expect(res.body.programs).toEqual([
      {
        slug: "first-programme",
        title: "First Programme",
        track: "software",
        levels: ["foundation", "advanced"],
        duration: "4 weeks",
        tools: ["Tool A"],
        summary: "Test summary.",
      },
      {
        slug: "second-programme",
        title: "Second Programme",
        track: "software",
        levels: ["professional"],
        duration: "4 weeks",
        tools: [],
        summary: "",
      },
    ]);
  });

  it("returns the full detail for a published slug, without internal fields", async () => {
    const res = await request(app).get("/api/programs/first-programme");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.program).toEqual({
      slug: "first-programme",
      title: "First Programme",
      track: "software",
      levels: ["foundation", "advanced"],
      duration: "4 weeks",
      tools: ["Tool A"],
      summary: "Test summary.",
      syllabus: [{ title: "Module 1", topics: ["Topic 1"] }],
      projects: ["Project 1"],
      mentorship: "",
      internship: "",
      certificate: "",
      certificateImage: "",
      faq: [{ question: "Q?", answer: "A." }],
    });
    expect(res.body.program).not.toHaveProperty("published");
    expect(res.body.program).not.toHaveProperty("order");
  });

  it.each([
    ["an unknown slug", "no-such-programme"],
    ["an unpublished slug", "hidden-programme"],
    ["a prototype key", "__proto__"],
    ["a slug with odd characters", "First-Programme"],
  ])("404s for %s, and does not cache it", async (_label, slug) => {
    const res = await request(app).get(`/api/programs/${encodeURIComponent(slug)}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Programme not found" });
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("is public: no login needed", async () => {
    const res = await request(app).get("/api/programs/second-programme");
    expect(res.status).toBe(200);
  });
});

describe("programme data file checks", () => {
  let dir;
  const valid = {
    slug: "ok-programme", title: "OK", published: true, order: 1, track: "software", levels: ["foundation"],
    duration: "", tools: [], summary: "", syllabus: [], projects: [], mentorship: "", internship: "",
    certificate: "", certificateImage: "", faq: [],
  };
  const writeOne = (program, file = `${program.slug}.json`) => {
    fs.readdirSync(dir).forEach((name) => fs.unlinkSync(path.join(dir, name)));
    fs.writeFileSync(path.join(dir, file), typeof program === "string" ? program : JSON.stringify(program));
  };

  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "programs-")); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("accepts a valid file", () => {
    writeOne(valid);
    expect(loadPrograms(dir).list).toHaveLength(1);
  });

  it.each([
    ["a trainer field", { ...valid, trainer: "Someone" }, /trainer/],
    ["a batch date inside the syllabus", { ...valid, syllabus: [{ title: "M1", topics: [], batchStart: "1 Dec" }] }, /batchStart/],
    ["a missing title", { ...valid, title: "" }, /title/],
    ["an unknown track", { ...valid, track: "marketing" }, /track/],
    ["a bad level", { ...valid, levels: ["Beginner"] }, /levels must be/],
    ["an empty levels list", { ...valid, levels: [] }, /levels must be/],
    ["levels that is not a list", { ...valid, levels: "foundation" }, /levels must be/],
    ["a repeated level", { ...valid, levels: ["foundation", "foundation"] }, /no repeats/],
    ["the old single level field", { ...valid, level: "foundation" }, /"level" is now "levels"/],
    ["a missing certificateImage", { ...valid, certificateImage: undefined }, /certificateImage/],
    ["a relative certificateImage", { ...valid, certificateImage: "cert.png" }, /certificateImage/],
    ["an http certificateImage", { ...valid, certificateImage: "http://example.com/c.png" }, /certificateImage/],
    ["a protocol-relative certificateImage", { ...valid, certificateImage: "//example.com/c.png" }, /certificateImage/],
    ["a non-boolean published", { ...valid, published: "yes" }, /published/],
  ])("rejects %s", (_label, program, message) => {
    writeOne(program);
    expect(() => loadPrograms(dir)).toThrow(message);
  });

  it("rejects a file whose name does not match its slug", () => {
    writeOne(valid, "other-name.json");
    expect(() => loadPrograms(dir)).toThrow(/file name/);
  });

  it("rejects invalid JSON", () => {
    writeOne("{ not json", "ok-programme.json");
    expect(() => loadPrograms(dir)).toThrow(/not valid JSON/);
  });
});
