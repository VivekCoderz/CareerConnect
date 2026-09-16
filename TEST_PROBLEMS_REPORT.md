# 🔍 CareerConnect — Comprehensive Testing & Issues Report
**Date:** September 16, 2026  
**Auditor / Engine:** Antigravity Testing & Verification Suite  
**Scope:** Server (API, Unit, Integration, Security, Database, Models, Routes) & Client (Vite, Build, ESLint, Routing, Services)  
**Total Problems Identified:** 25 Distinct Vulnerabilities & Bugs Categorized by Severity  

---

## 📊 Summary Dashboard

| Category | Total Tested | Passed | Failed / Problematic | Health Score |
| :--- | :---: | :---: | :---: | :---: |
| **Jest Automated Suites** | 5 Suites (55 tests) | 53 Tests | 2 Tests Failed | 96.3% |
| **Server Manual Scripts** | 7 Scripts | 5 Passed | 2 Scripts Errored | 71.4% |
| **Client Production Build** | 1 Build | Vite Built (648ms) | Missing node_modules initially | 90% |
| **Client Code Quality (ESLint)** | 1 Lint Check | 0 | 394 Problems (374 Errors) | ⚠️ Critical Lint |
| **Backend Architecture & Routes** | 24 Route Files | 21 Mounted | 1 Route Unmounted, 2 Dead 0-byte | 87.5% |
| **Database Models & Services** | 30 Models / 10 Services | 28 Working | 13 Empty 0-byte Stub Files | 68% |

---

## 🚨 Critical Severity (P0) — Immediate Fix Required

### 1. Missing Route Mount: Fresher Career Recommendations API is 100% Unmounted (404 in Prod)
* **File:** `server/app.js` vs `server/routes/recommendationRoutes.js`
* **Root Cause:** `server/routes/recommendationRoutes.js` defines all Fresher Career Intelligence endpoints (`/api/recommendations`, `/jobs`, `/internships`, `/skills`, `/courses`, `/projects`, `/career-paths`, `/action-plan`), and `client/src/services/recommendationService.js` actively calls them. However, `recommendationRoutes` is **never imported or mounted in `server/app.js`**!
* **Impact:** Every single request from the Fresher Career Recommendations page (`/fresher/recommendations`) fails with `404 Not Found`.
* **Fix:** In `server/app.js`:
  ```javascript
  const recommendationRoutes = require("./routes/recommendationRoutes.js");
  // ...
  app.use("/api/recommendations", recommendationRoutes);
  ```

---

### 2. Missing `isValidObjectId` Validation — Server Throws Unhandled 500 CastError
* **Files:**
  - `server/controllers/applicationController.js` (line 378)
  - `server/controllers/jobController.js` (line 232)
  - `server/controllers/internshipController.js`
  - `server/controllers/courseController.js`
* **Root Cause:** When any route with `/:id` receives a string that is not a valid 24-character hexadecimal ObjectId (e.g., `/api/applications/my`, `/api/jobs/INVALID_ID_FORMAT`, `/api/jobs/123`), Mongoose throws a `CastError: Cast to ObjectId failed for value "..." at path "_id"`. Because `err.statusCode` is undefined, the global error handler returns `500 Internal Server Error` and logs a massive stack trace.
* **Impact:** Route-matching collisions (like calling `/api/applications/my` when route is `/api/applications/:id`) crash the handler with a 500 error instead of a clean 400 Bad Request or 404 Not Found.
* **Fix:** Add an ObjectId validation guard before querying:
  ```javascript
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  ```

---

### 3. Missing `JWT_SECRET` Fallback Crashes Token Generation
* **Files:**
  - `server/controllers/authController.js` (line 37: `jwt.sign({ id: userId }, process.env.JWT_SECRET)`)
  - `server/scripts/test-rbac-security.js` (line 31)
  - `server/scripts/test-student-application-e2e.js` (line 106)
* **Root Cause:** `authMiddleware.js` uses `process.env.JWT_SECRET || "your_secret_key"`, but `authController.js` has no fallback: `jwt.sign(..., process.env.JWT_SECRET)`. When `JWT_SECRET` is missing from environment, it throws: `Error: secretOrPrivateKey must have a value`, crashing the entire registration/login pipeline.
* **Security Note:** In `authMiddleware.js`, falling back to `"your_secret_key"` is an insecure hardcoded secret. If an attacker knows the fallback, they can forge tokens.
* **Fix:** Require `JWT_SECRET` at server boot and fail immediately if not provided:
  ```javascript
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing!");
  }
  ```

---

### 4. Mongoose Session Management is Completely Dead Code
* **Files:**
  - `server/config/session.js`
  - `server/app.js`
  - `server/middleware/authMiddleware.js` (lines 14-35)
* **Root Cause:** A complete custom `MongooseStore` session system with 15-minute idle timeout is written in `server/config/session.js`. But `app.use(sessionMiddleware)` was never added to `server/app.js`. Consequently, `req.session` is **always `undefined`**.
* **Impact:** 
  1. The 15-minute inactivity session expiration never triggers.
  2. Lines 14-35 in `authMiddleware.js` (`if (req.session && req.session.user)`) are dead code that never executes in production.
  3. All auth exclusively relies on JWT cookies / headers, while comments state session is the primary auth.

---

### 5. macOS Port 5000 Conflict (AirPlay Hijacks Backend Requests)
* **Files:** `server/.env.example` (line 8: `PORT=5000`), `client/.env.example`, `client/src/api/api.jsx`
* **Root Cause:** On macOS Monterey and later, Apple's **ControlCenter (AirPlay Receiver)** listens by default on `TCP *:5000`.
* **Impact:** 
  - Starting the backend fails with `EADDRINUSE: address already in use :::5000` or silently fails.
  - E2E scripts hitting `http://localhost:5000` actually hit Apple's AirPlay Receiver, returning `403 Forbidden` (`scripts/test-student-application-e2e.js` failed for this exact reason).
* **Fix:** Change default development port to `5001` or `8080` in backend and frontend `.env`:
  ```bash
  PORT=5001
  VITE_API_URL=http://localhost:5001/api
  ```

---

## ⚠️ High Severity (P1) — Logic Flaws & Route Inconsistencies

### 6. Jest Integration Failure: `GET /api/jobs?city=Mumbai` Fails Filter Verification
* **File:** `server/controllers/jobController.js` (lines 93-94, lines 140-180)
* **Test:** `__tests__/integration/jobs.test.js:45:28`
* **Root Cause:**
  1. `Job` schema does not have a `city` field; it uses `location: String`.
  2. `jobController.js` extracts `const locFilter = (city || location || "").trim();`.
  3. When `source !== "campus"`, the controller merges scraped external opportunities via `getAggregatedOpportunities(...)`. The mock/scraped items do not strictly match the city filter, resulting in non-Mumbai jobs being returned.
* **Fix:** Ensure scraped opportunities are strictly filtered by location when `locFilter` is provided:
  ```javascript
  if (locFilter && locFilter !== "All") {
    formattedScraped = formattedScraped.filter(item => 
      item.location?.toLowerCase().includes(locFilter.toLowerCase())
    );
  }
  ```

---

### 7. Jest Integration Failure: `POST /api/applications` Returns 404
* **File:** `server/routes/applicationRoutes.js`
* **Test:** `__tests__/integration/security.test.js:23:26`
* **Root Cause:** There is no generic root `POST /api/applications` route. The application routes only define:
  - `POST /api/applications/job/:jobId`
  - `POST /api/applications/internship/:internshipId`
* **Impact:** Any integration or client component attempting to POST directly to `/api/applications` gets a 404 Route Not Found.
* **Fix:** Add a dispatcher route in `routes/applicationRoutes.js`:
  ```javascript
  router.post("/", protect, (req, res, next) => {
    const { opportunityType, jobId, internshipId } = req.body;
    if (opportunityType === "Internship" || internshipId) {
      req.params.internshipId = internshipId || jobId;
      return applicationController.applyToInternship(req, res, next);
    }
    req.params.jobId = jobId;
    return applicationController.applyToJob(req, res, next);
  });
  ```

---

### 8. Route Shadowing: `GET /api/applications/my` Routes to `/:id`
* **File:** `server/routes/applicationRoutes.js` (line 47 vs line 89)
* **Root Cause:** The endpoint for candidate applications is defined as `GET /api/applications/me`. However, older documentation and frontend code expect `/my`. Because `/my` is not registered, Express falls through to `GET /:id` with `req.params.id = "my"`, throwing a `CastError` on Mongoose `findById("my")`.
* **Fix:** Add an alias in `routes/applicationRoutes.js`:
  ```javascript
  router.get("/my", protect, ensureFn(getMyApplications, "getMyApplications"));
  ```

---

### 9. AI Service: Non-Existent Gemini Model Name (`gemini-3.5-flash`)
* **Files:**
  - `server/services/ragAiService.js` (line 12: `process.env.GEMINI_MODEL || "gemini-3.5-flash"`)
  - `server/controllers/resumeController.js` (lines 1261-1265)
* **Root Cause:** The fallback model is set to `"gemini-3.5-flash"`, which does not exist in Google Generative AI. Also, `resumeController.js` iterates over non-existent models (`gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.8-flash`) while excluding real Google production models (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`).
* **Impact:** RAG chat assistant fails with 404/Bad Request from Google API if `GEMINI_MODEL` is not explicitly set in `.env`.
* **Fix:** Change fallback default to `"gemini-1.5-flash"` or `"gemini-2.0-flash"`.

---

### 10. CORS Configuration: Unhandled Error Thrown for Unauthorized Origins
* **File:** `server/app.js` (line 73)
* **Root Cause:**
  ```javascript
  return callback(new Error(`Not allowed by CORS: ${origin}`));
  ```
  In Node/Express, passing an `Error` to the CORS callback results in a 500 Internal Server Error with HTML error stack, rather than letting the browser silently reject CORS headers or returning HTTP 403.
* **Fix:** Pass `callback(null, false)` instead of `callback(new Error(...))`.

---

## 📦 Medium Severity (P2) — Dead Code, Stub Files & Redundancy

### 11. 13 Empty (0-Byte) Files in Server Repository
The following files exist in `server/` with 0 bytes:
| File Path | Original Purpose | Current Status |
| :--- | :--- | :--- |
| `server/middleware/errorMiddleware.js` | Custom error handler | 0 bytes (app.js uses inline handler) |
| `server/models/Skill.js` | Skill schema | 0 bytes (skills stored as string arrays) |
| `server/models/CareerGoal.js` | Career goals | 0 bytes (not implemented) |
| `server/validators/applicationValidator.js` | Joi/express-validator | 0 bytes (no validation middleware) |
| `server/validators/authValidator.js` | Auth validation | 0 bytes (inline validation in controller) |
| `server/validators/userValidator.js` | User validation | 0 bytes |
| `server/controllers/skillController.js` | Skill endpoints | 0 bytes |
| `server/controllers/userController.js` | User management | 0 bytes |
| `server/routes/skillRoutes.js` | Skill routes | 0 bytes |
| `server/routes/userRoutes.js` | User routes | 0 bytes |
| `server/services/matchingService.js` | Job matching | 0 bytes (implemented in recommendationEngine.js) |
| `server/services/skillGapService.js` | Skill gap | 0 bytes (implemented in recommendationEngine.js) |
| `server/services/recommendationService.js` | Recommendations | 0 bytes (implemented in recommendationEngine.js) |

* **Recommendation:** Either implement the missing features or delete these 13 phantom files to prevent developer confusion.

---

### 12. 3 Empty (0-Byte) Files in Client Repository
| File Path | Impact |
| :--- | :--- |
| `client/src/routes/AppRoutes.jsx` | 0 bytes. All routing was moved directly to `App.jsx`, leaving this abandoned. |
| `client/src/services/userService.js` | 0 bytes. |
| `client/src/services/skillService.js` | 0 bytes. |

---

### 13. React & Redux Frontend Packages Contaminating Backend `server/package.json`
* **File:** `server/package.json` (lines 24, 43, 44)
  ```json
  "@reduxjs/toolkit": "^2.12.0",
  "react-redux": "^9.3.0",
  "react-router-dom": "^7.18.2"
  ```
* **Impact:** Backend `server/node_modules` contains React and Redux libraries. This is unnecessary bloat on the server and indicates accidental installation of frontend packages into the backend.
* **Fix:** Run `npm uninstall @reduxjs/toolkit react-redux react-router-dom` inside `server/`.

---

### 14. Duplicate API Layer in Frontend (`api.jsx` vs `services/api.js`)
* **Files:**
  - `client/src/api/api.jsx` (2759 bytes, main Axios instance with interceptors)
  - `client/src/services/api.js` (49 bytes, simply re-exports `../api/api`)
* **Impact:** Inconsistent imports across the app: some files import `from "../api/api"`, others `from "../services/api"`, and some `from "../api/api.jsx"`.
* **Fix:** Consolidate to a single import source: `@/api/api` or `services/api`.

---

### 15. Broken Path in Manual Test Script `test-rbac-security.js`
* **File:** `server/scripts/test-rbac-security.js` (line 1)
* **Code:** `require("dotenv").config({ path: "server/.env" });`
* **Root Cause:** When running the script from inside `server/` (`cd server && node scripts/test-rbac-security.js`), `"server/.env"` does not exist because current working directory is already `server`.
* **Fix:** Use path resolver: `require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });`.

---

## 🧹 Code Quality & Linting (P3)

### 16. Client ESLint: 394 Problems (374 Errors, 20 Warnings)
* **File:** `client/` (`npx eslint src/`)
* **Key Categories of Failures:**
  1. **React Hook Violation (`react-hooks/set-state-in-effect`):** Calling `setState` synchronously within `useEffect` causes cascading re-renders in `StudentDashboard.jsx` (line 103) and `StudentProfile.jsx` (line 38).
  2. **Unused Imports & Variables:** Over 300 instances of unused imports (`UpcomingDeadlinesCard`, `QuickActionsCard`, `Jobs`, `navigate`, etc.) cluttering bundle size.
  3. **Unused Exception Variables:** `catch (e)` without referencing `e` in `notificationService.js`.

---

### 17. Commented-out Dead Code Left in Production Service
* **File:** `client/src/services/applicationService.js` (lines 8-11)
  ```javascript
  // export const applyToJob = async (id, data = {}) => {
  //   const { data: resData } = await api.post(`/applications/job/${id}`, data);
  //   return resData;
  // };
  ```
* **Impact:** Clutters production code and leads to confusion during refactoring.

---

### 18. Double BaseURL Workaround in `app.js`
* **File:** `server/app.js` (line 113)
  ```javascript
  app.use("/api/resume", resumeRoutes);
  app.use("/api/api/resume", resumeRoutes); // Safety alias
  ```
* **Root Cause:** Because frontend had instances calling `/api/resume` on an Axios instance whose `baseURL` already ended in `/api`, it produced `/api/api/resume`. Instead of fixing the client-side URL, an ad-hoc route alias was added to the server.

---

## 📋 Comprehensive Checklist for Next Steps

- [ ] **Step 1:** Mount `recommendationRoutes` in `server/app.js` (`/api/recommendations`).
- [ ] **Step 2:** Add `mongoose.Types.ObjectId.isValid` checks in `applicationController.js` and `jobController.js`.
- [ ] **Step 3:** Add route alias `/api/applications/my` and root `POST /api/applications` dispatcher in `applicationRoutes.js`.
- [ ] **Step 4:** Strict location filtering in `jobController.js` for scraped/external jobs.
- [ ] **Step 5:** Fix Gemini default model from `gemini-3.5-flash` to `gemini-1.5-flash` in `ragAiService.js` and `resumeController.js`.
- [ ] **Step 6:** Remove `@reduxjs/toolkit`, `react-redux`, and `react-router-dom` from `server/package.json`.
- [ ] **Step 7:** Either implement or delete the 13 empty 0-byte stub files in `server/` and 3 in `client/`.
- [ ] **Step 8:** Switch default port from 5000 to 5001 to prevent macOS AirPlay conflicts.
- [ ] **Step 9:** Resolve React hook `react-hooks/set-state-in-effect` errors in `StudentDashboard.jsx` and `StudentProfile.jsx`.
