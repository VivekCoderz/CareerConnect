const express = require("express");
const request = require("supertest");
const mongoose = require("mongoose");
const { rateLimit } = require("express-rate-limit");
const { MongoRateLimitStore, COLLECTION } = require("../../utils/mongoRateLimitStore");

// Two copies of the rate-limit middleware module, as two web instances would load it: each
// has its own limiter objects and stores, and they share only the database. (Each real
// instance has its own connected mongoose; here both use the test's connection.)
const loadInstance = () => {
  let middleware;
  jest.isolateModules(() => {
    jest.doMock("mongoose", () => mongoose);
    middleware = require("../../middleware/rateLimitMiddleware");
  });
  return middleware;
};

const appWith = (limiter) => {
  const app = express();
  app.use(express.json());
  app.post("/hit", limiter, (req, res) => res.json({ ok: true }));
  return app;
};

const counters = () => mongoose.connection.collection(COLLECTION);

describe("rate limits shared across web instances (MongoDB store)", () => {
  it("the login limit (10/min) holds when requests alternate between two instances", async () => {
    const a = appWith(loadInstance().loginLimiter);
    const b = appWith(loadInstance().loginLimiter);

    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const res = await request(i % 2 ? b : a).post("/hit").send({});
      statuses.push(res.statusCode);
    }

    // With a per-process memory store each instance would allow 10, so all 12 would pass.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("the OTP send limit (5 per 15 min) holds across instances, per IP and email", async () => {
    const a = appWith(loadInstance().otpSendLimiter);
    const b = appWith(loadInstance().otpSendLimiter);
    const send = (app, email) => request(app).post("/hit").send({ email });

    for (let i = 0; i < 5; i++) {
      expect((await send(i % 2 ? b : a, "Asha@Example.com")).statusCode).toBe(200);
    }
    expect((await send(b, "asha@example.com")).statusCode).toBe(429);
    expect((await send(a, "asha@example.com")).statusCode).toBe(429);
    // Another email is counted on its own.
    expect((await send(a, "ravi@example.com")).statusCode).toBe(200);
  });

  it("limiters with different names keep separate counts for the same IP", async () => {
    const instance = loadInstance();
    const login = appWith(instance.loginLimiter);
    const live = appWith(instance.internshipsLiveLimiter);

    for (let i = 0; i < 10; i++) await request(login).post("/hit").send({});
    expect((await request(login).post("/hit").send({})).statusCode).toBe(429);
    expect((await request(live).post("/hit").send({})).statusCode).toBe(200);
  });

  it("starts a new window once the old one has ended", async () => {
    const make = () => rateLimit({ windowMs: 1000, limit: 2, store: new MongoRateLimitStore("window-test") });
    const a = appWith(make());
    const b = appWith(make());

    expect((await request(a).post("/hit")).statusCode).toBe(200);
    expect((await request(b).post("/hit")).statusCode).toBe(200);
    expect((await request(a).post("/hit")).statusCode).toBe(429);

    await counters().updateMany({}, { $set: { resetTime: new Date(Date.now() - 1) } }); // window over
    expect((await request(b).post("/hit")).statusCode).toBe(200);
  });

  it("counts concurrent requests on two instances exactly", async () => {
    const make = () => rateLimit({ windowMs: 60000, limit: 1000, store: new MongoRateLimitStore("race-test") });
    const a = appWith(make());
    const b = appWith(make());

    await Promise.all(Array.from({ length: 40 }, (_, i) => request(i % 2 ? b : a).post("/hit")));

    const doc = await counters().findOne({ _id: /^race-test:/ });
    expect(doc.hits).toBe(40);
  });

  it("expired windows are removed by a TTL index", async () => {
    appWith(loadInstance().loginLimiter);
    await request(appWith(loadInstance().loginLimiter)).post("/hit").send({});
    const indexes = await counters().indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { resetTime: 1 }, expireAfterSeconds: 0 }),
    ]));
  });

  it("lets requests through if the database fails, instead of failing every API call", async () => {
    const limiter = loadInstance().loginLimiter;
    const spy = jest.spyOn(MongoRateLimitStore.prototype, "increment").mockRejectedValue(new Error("db down"));
    try {
      expect((await request(appWith(limiter)).post("/hit").send({})).statusCode).toBe(200);
    } finally {
      spy.mockRestore();
    }
  });
});
