const mongoose = require("mongoose");
const User = require("../../models/User");
const { cleanupLegacyIndexes } = require("../../config/db");

// Databases created before employers could share a phone number still have the old index
// (unique across every account). Startup replaces it with the candidates-only one.
describe("users phone index migration", () => {
  const users = () => mongoose.connection.db.collection(User.collection.name);
  const phoneIndex = async () => (await users().indexes()).find((i) => i.name === "phone_1_countryCode_1");
  const employer = (n) => ({ email: `idx-employer-${n}@example.com`, phone: "9555500000", countryCode: "+91", role: "employer" });

  beforeEach(async () => {
    await User.init();
    await users().dropIndex("phone_1_countryCode_1").catch(() => {});
    await users().createIndex(
      { phone: 1, countryCode: 1 },
      { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } }
    );
  });

  it("replaces the old index so employers can share a number, and keeps candidates unique", async () => {
    await users().insertOne(employer(1));
    await expect(users().insertOne(employer(2))).rejects.toThrow(/duplicate key/);

    await cleanupLegacyIndexes({ connection: mongoose.connection });

    expect((await phoneIndex()).partialFilterExpression).toMatchObject({ role: "user" });
    await users().insertOne(employer(2));
    await users().insertOne({ email: "idx-cand-1@example.com", phone: "9555500000", countryCode: "+91", role: "user" });
    await expect(
      users().insertOne({ email: "idx-cand-2@example.com", phone: "9555500000", countryCode: "+91", role: "user" })
    ).rejects.toThrow(/duplicate key/);
  });

  it("leaves the new index alone on later startups", async () => {
    await cleanupLegacyIndexes({ connection: mongoose.connection });
    const before = await phoneIndex();
    await cleanupLegacyIndexes({ connection: mongoose.connection });
    expect(await phoneIndex()).toEqual(before);
  });
});
