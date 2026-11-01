/**
 * Creates or resets the staging test accounts, one per role (H02): the three candidate types,
 * employer, company team member, company admin, super admin and the legacy "admin" role. All
 * use the password in STAGING_TEST_PASSWORD and an @staging.invalid email, so nothing is ever
 * emailed to them.
 *
 * Refuses to run unless MONGODB_URI names a database containing "staging".
 *
 * Usage (from server/, with MONGODB_URI and STAGING_TEST_PASSWORD set):
 *   node scripts/seed-staging-accounts.js
 */
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const { databaseName, STAGING_DB_MARKER, STAGING_EMAIL_DOMAIN } = require("../config/environment");

const COMPANY_NAME = "Staging Test Company";

const ACCOUNTS = [
  { key: "student", fullName: "Staging Student", role: "user", userType: "student" },
  { key: "fresher", fullName: "Staging Fresher", role: "user", userType: "fresher" },
  { key: "professional", fullName: "Staging Professional", role: "user", userType: "professional" },
  { key: "employer", fullName: "Staging Employer", role: "employer", userType: "employer" },
  // An employer who belongs to the staging company.
  { key: "teammember", fullName: "Staging Team Member", role: "employer", userType: "employer", withCompany: true },
  { key: "companyadmin", fullName: "Staging Company Admin", role: "COMPANY_ADMIN", userType: "admin", withCompany: true },
  { key: "superadmin", fullName: "Staging Super Admin", role: "SUPER_ADMIN", userType: "admin" },
  { key: "admin", fullName: "Staging Legacy Admin", role: "admin", userType: "admin" },
];

async function main() {
  const uri = process.env.MONGODB_URI || "";
  if (!databaseName(uri).toLowerCase().includes(STAGING_DB_MARKER)) {
    throw new Error(`Refusing: MONGODB_URI must name a database containing "${STAGING_DB_MARKER}".`);
  }
  const password = process.env.STAGING_TEST_PASSWORD || "";
  if (password.length < 10) throw new Error("Set STAGING_TEST_PASSWORD (at least 10 characters).");

  await mongoose.connect(uri);
  const company = await Company.findOneAndUpdate(
    { name: COMPANY_NAME },
    { $set: { name: COMPANY_NAME, email: `company@${STAGING_EMAIL_DOMAIN}`, industry: "Testing", status: "active" } },
    { upsert: true, returnDocument: "after" }
  );

  for (const account of ACCOUNTS) {
    const email = `${account.key}@${STAGING_EMAIL_DOMAIN}`;
    const user = (await User.findOne({ email }).select("+password")) || new User({ email, username: `staging_${account.key}` });
    Object.assign(user, {
      fullName: account.fullName,
      role: account.role,
      userType: account.userType,
      companyId: account.withCompany ? company._id : null,
      password, // hashed by the User pre-save hook
      hasPassword: true,
      authProviders: ["local"],
      status: "active",
      isActive: true,
      isEmailVerified: true,
      consent: { termsVersion: "staging", acceptedAt: new Date() },
    });
    await user.save();
    console.log(`${account.role.padEnd(13)} ${email}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
