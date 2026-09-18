/**
 * Unit Test for Connect Company with CareerConnect logic
 * Validates model schemas, validations, and controller functions with mocks.
 */
const assert = require("assert");

console.log("\n========================================================");
console.log("   UNIT TESTING: CONNECT COMPANY WITH CAREERCONNECT");
console.log("========================================================\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  // 1. Verify OrganizationRequest Model schema
  await test("OrganizationRequest model exports and contains new 9 fields without required reason", () => {
    const OrganizationRequest = require("../models/OrganizationRequest");
    const schema = OrganizationRequest.schema.paths;

    assert(schema.organizationName, "Missing organizationName path");
    assert(schema.officialEmail, "Missing officialEmail path");
    assert(schema.website, "Missing website path");
    assert(schema.industry, "Missing industry path");
    assert(schema.companySize, "Missing companySize path");
    assert(schema.verificationDocument, "Missing verificationDocument path");
    assert(schema.requestingEmployeeName, "Missing requestingEmployeeName path");
    assert(schema.employeeDesignation, "Missing employeeDesignation path");
    assert(schema.officialEmployeeEmail, "Missing officialEmployeeEmail path");
    assert(schema.requestedBy, "Missing requestedBy path");

    // Verify reason is NOT required
    assert(!schema.reason.isRequired, "Reason should NOT be required in OrganizationRequest");
  });

  // 2. Verify employerController requestCompanyApproval validation logic
  await test("requestCompanyApproval rejects missing required fields (e.g. verificationDocument)", async () => {
    const employerController = require("../controllers/employerController");
    
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { _id: "user_mock_123", email: "test@example.com", fullName: "Test User" },
      body: {
        companyName: "Acme Corp",
        officialCompanyEmail: "company@acme.com",
        companyWebsite: "https://acme.com",
        industry: "Tech",
        companySize: "11-50",
        // verificationDocument is missing
        requestingEmployeeName: "Test User",
        employeeDesignation: "Recruiter",
        officialEmployeeEmail: "test@example.com",
      },
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; },
        };
      },
    };

    await employerController.requestCompanyApproval(req, res);
    assert.strictEqual(statusCode, 400, `Expected status 400 for missing doc, got ${statusCode}`);
    assert(responseData.message.toLowerCase().includes("registration") || responseData.message.toLowerCase().includes("verification"), `Expected message about verification doc, got: ${responseData?.message}`);
  });

  // 3. Verify employerController rejects invalid company email
  await test("requestCompanyApproval rejects invalid email syntax", async () => {
    const employerController = require("../controllers/employerController");
    
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { _id: "user_mock_123", email: "test@example.com", fullName: "Test User" },
      body: {
        companyName: "Acme Corp",
        officialCompanyEmail: "not-an-email",
        companyWebsite: "https://acme.com",
        industry: "Tech",
        companySize: "11-50",
        verificationDocument: "https://example.com/doc.pdf",
        requestingEmployeeName: "Test User",
        employeeDesignation: "Recruiter",
        officialEmployeeEmail: "test@example.com",
      },
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; },
        };
      },
    };

    await employerController.requestCompanyApproval(req, res);
    assert.strictEqual(statusCode, 400, `Expected status 400 for invalid email, got ${statusCode}`);
    assert(responseData.message.toLowerCase().includes("email"), `Expected email error, got: ${responseData?.message}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
