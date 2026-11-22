// k6 load test against STAGING (Q03 rerun with two web instances and the worker).
// Never point this at production.
//
//   k6 run -e BASE_URL=https://<staging-api> -e TEST_PASSWORD=<STAGING_TEST_PASSWORD> scripts/load/k6-staging.js
//
// Pass/fail (the run exits non-zero if a threshold fails):
//   - 100 virtual users at peak
//   - job list (GET /api/jobs) p95 under 1.5 s
//   - failed requests under 1%
// The scheduled-jobs check (each job ran once) is done in MongoDB after the run, see
// docs/load-test-staging.md.
//
// Before the run, raise RATE_LIMIT_GLOBAL_MAX on staging (all VUs share this machine's IP,
// and the default 300 requests / 15 min per IP would turn most requests into 429s).

import http from "k6/http";
import { check, fail, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/$/, "");
const PASSWORD = __ENV.TEST_PASSWORD;
const PEAK_USERS = Number(__ENV.PEAK_USERS || 100);

if (!BASE_URL || !PASSWORD) {
  throw new Error("Set BASE_URL (staging API) and TEST_PASSWORD (STAGING_TEST_PASSWORD)");
}
if (!/staging|localhost|127\.0\.0\.1/i.test(BASE_URL)) {
  throw new Error(`BASE_URL must be the staging API, got ${BASE_URL}`);
}

export const options = {
  scenarios: {
    candidates: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: PEAK_USERS }, // ramp up
        { duration: "5m", target: PEAK_USERS }, // hold at 100 users
        { duration: "30s", target: 0 }, // ramp down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    "http_req_duration{name:job list}": ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

// The staging test accounts (docs/staging.md). Sign in once each here: the login limit is
// 10 per minute per IP, so 100 VUs can't each sign in.
const ACCOUNTS = [
  { email: "student@staging.invalid", dashboard: "/api/student/dashboard" },
  { email: "fresher@staging.invalid", dashboard: "/api/fresher/dashboard" },
  { email: "professional@staging.invalid", dashboard: "/api/professional/dashboard" },
];

export function setup() {
  const health = http.get(`${BASE_URL}/health`);
  if (health.status !== 200) fail(`staging /health returned ${health.status}`);

  return ACCOUNTS.map(({ email, dashboard }) => {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password: PASSWORD }), {
      headers: { "Content-Type": "application/json" },
      tags: { name: "login" },
    });
    const token = res.cookies.token?.[0]?.value;
    if (res.status !== 200 || !token) fail(`login failed for ${email}: ${res.status}`);
    return { cookie: `token=${token}`, dashboard };
  });
}

const SEARCHES = ["", "", "", "developer", "engineer", "analyst", "react", "intern"];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// One candidate's visit: browse the job list a few times, open their dashboard, check
// internships and their account. Think time between steps, like a person.
export default function (sessions) {
  const session = sessions[(__VU - 1) % sessions.length];
  const params = (name) => ({ headers: { Cookie: session.cookie }, tags: { name } });

  for (let i = 0; i < 3; i++) {
    const search = pick(SEARCHES);
    const page = 1 + Math.floor(Math.random() * 3);
    const query = `page=${page}&limit=12${search ? `&search=${encodeURIComponent(search)}` : ""}`;
    const jobs = http.get(`${BASE_URL}/api/jobs?${query}`, params("job list"));
    check(jobs, { "job list 200": (r) => r.status === 200 });
    sleep(1 + Math.random() * 2);
  }

  const dashboard = http.get(`${BASE_URL}${session.dashboard}`, params("dashboard"));
  check(dashboard, { "dashboard 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);

  const internships = http.get(`${BASE_URL}/api/internships?page=1&limit=12`, params("internship list"));
  check(internships, { "internships 200": (r) => r.status === 200 });

  const me = http.get(`${BASE_URL}/api/auth/me`, params("me"));
  check(me, { "me 200": (r) => r.status === 200 });
  sleep(2 + Math.random() * 3);
}
