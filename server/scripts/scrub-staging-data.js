/**
 * Scrubs personal data from a restored copy of production before it becomes staging (H02).
 * Fails (exit 1) if any email, phone number or real name is still found afterwards.
 *
 * Only runs against a local database (the scratch copy in the staging-refresh workflow) or one
 * whose name contains "staging"; never against production.
 *
 * Usage (from server/):
 *   node scripts/scrub-staging-data.js <mongodb-uri>                 scrub, then verify
 *   node scripts/scrub-staging-data.js <mongodb-uri> --verify-only   only check for emails/phones
 */
const mongoose = require("mongoose");
const { databaseName, STAGING_DB_MARKER } = require("../config/environment");
const { scrubDatabase, findLeftovers } = require("./staging/scrubPersonalData");

const isLocal = (uri) => /^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(uri);

async function main() {
  const uri = process.argv[2] || "";
  const verifyOnly = process.argv.includes("--verify-only");
  const name = databaseName(uri);
  if (!name) throw new Error("Pass a MongoDB URI that names the database, e.g. mongodb://127.0.0.1:27017/careerconnect");
  if (!isLocal(uri) && !name.toLowerCase().includes(STAGING_DB_MARKER)) {
    throw new Error(`Refusing: "${name}" is neither a local database nor a ${STAGING_DB_MARKER} database.`);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  let tokens = [];
  if (!verifyOnly) {
    ({ tokens } = await scrubDatabase(db, { log: (line) => console.log(line) }));
  }
  const leftovers = await findLeftovers(db, tokens);
  await mongoose.disconnect();

  if (Object.keys(leftovers).length) {
    console.error("Personal data still found (counts per collection):");
    console.error(JSON.stringify(leftovers, null, 2));
    process.exit(1);
  }
  console.log(`Verified: no real emails, phone numbers${verifyOnly ? "" : " or user names"} left in "${name}".`);
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
