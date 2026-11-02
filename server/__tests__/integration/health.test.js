const request = require("supertest");
const dbStatus = require("../../utils/dbStatus");
const app = require("../../app");

describe("GET /health", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns 200 when the database is connected", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.database).toBe("connected");
  });

  it("returns 503 when the database is unavailable", async () => {
    jest.spyOn(dbStatus, "isDatabaseConnected").mockReturnValue(false);
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(503);
    expect(res.body.database).toBe("unavailable");
  });
});
