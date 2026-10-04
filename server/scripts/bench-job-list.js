// Benchmark GET /api/jobs against a local in-memory MongoDB seeded with synthetic listings.
// Uses its own throwaway MongoDB; never connects to MONGO_URI.
// Usage: node scripts/bench-job-list.js [jobCount] [requests] [concurrency]
const path = require("path");
const serverDir = path.join(__dirname, "..");
const JOBS = Number(process.argv[2] || 20000);
const REQUESTS = Number(process.argv[3] || 1000);
const CONCURRENCY = Number(process.argv[4] || 10);
const r = (m) => require(path.join(serverDir, "node_modules", m));
const { MongoMemoryServer } = r("mongodb-memory-server");
const mongoose = r("mongoose");
const http = require("http");

(async () => {
  const mongod = await MongoMemoryServer.create();
  const app = require(path.join(serverDir, "app"));
  process.env.RATE_LIMIT_GLOBAL_MAX = "100000000";
  await mongoose.connect(mongod.getUri());
  const Job = require(path.join(serverDir, "models", "Job"));
  await Job.init();

  const DAY = 864e5;
  const titles = ["Backend Engineer", "Frontend Developer", "Data Analyst", "QA Engineer", "DevOps Engineer", "Product Designer"];
  const cities = ["Bangalore", "Delhi", "Pune", "Remote", "Berlin", "Hyderabad"];
  const docs = [];
  for (let i = 0; i < JOBS; i++) {
    const ext = i % 5 === 0;
    docs.push({
      title: `${titles[i % titles.length]} ${i}`,
      description: `Role ${i} working with node mongodb react sql`,
      companyName: `Company ${i % 300}`,
      location: cities[i % cities.length], city: cities[i % cities.length],
      workMode: i % 3 === 0 ? "Remote" : "On-site",
      employmentType: i % 7 === 0 ? "Internship" : "Full-time",
      category: "Engineering",
      requiredSkills: ["node", "react", "sql"].slice(0, 1 + (i % 3)),
      status: i % 10 === 9 ? "Closed" : "Published",
      // ~5% of listings past their deadline
      deadline: i % 20 === 0 ? new Date(Date.now() - 5 * DAY) : new Date(Date.now() + 30 * DAY),
      isExternal: ext,
      source: ext ? (i % 2 ? "Remotive" : "Arbeitnow") : "CareerConnect",
      externalId: ext ? `ext-${i}` : null,
      applyUrl: ext ? `https://example.com/jobs/${i}` : "",
      attribution: ext ? "Job listing from Remotive (remotive.com)" : "",
      createdAt: new Date(Date.now() - (i % 90) * DAY),
    });
  }
  await Job.collection.insertMany(docs.map((d) => ({ ...d, updatedAt: new Date() })));

  const server = http.createServer(app).listen(0);
  const port = server.address().port;
  const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY });
  const paths = [
    "/api/jobs",
    "/api/jobs?page=5&limit=10",
    "/api/jobs?search=engineer",
    "/api/jobs?source=external",
    "/api/jobs?location=Remote",
    "/api/jobs?sort=salary_high",
  ];
  const get = (p) => new Promise((resolve, reject) => {
    const t = process.hrtime.bigint();
    http.get({ port, path: p, agent }, (res) => {
      res.resume();
      res.on("end", () => (res.statusCode === 200 ? resolve(Number(process.hrtime.bigint() - t) / 1e6) : reject(new Error(`${p} -> ${res.statusCode}`))));
    }).on("error", reject);
  });

  for (let i = 0; i < 30; i++) await get(paths[i % paths.length]); // warm-up
  const all = [];
  const perPath = Object.fromEntries(paths.map((p) => [p, []]));
  let next = 0;
  const worker = async () => {
    while (next < REQUESTS) {
      const p = paths[next++ % paths.length];
      const ms = await get(p);
      all.push(ms);
      perPath[p].push(ms);
    }
  };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const wall = Date.now() - t0;
  const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)].toFixed(1); };
  console.log(`jobs=${JOBS} requests=${all.length} concurrency=${CONCURRENCY} wall=${wall}ms throughput=${(all.length / wall * 1000).toFixed(0)} req/s`);
  console.log(`ALL  p50=${pct(all, 0.5)}ms p95=${pct(all, 0.95)}ms p99=${pct(all, 0.99)}ms max=${Math.max(...all).toFixed(1)}ms`);
  for (const [p, arr] of Object.entries(perPath)) console.log(`${p.padEnd(30)} n=${arr.length} p50=${pct(arr, 0.5)} p95=${pct(arr, 0.95)} p99=${pct(arr, 0.99)}`);

  server.close(); agent.destroy();
  await mongoose.disconnect(); await mongod.stop();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
