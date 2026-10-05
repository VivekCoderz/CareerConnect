// One-time migration: recruiterPreferences.allowContact true -> false (opt-in).
const mongoose = require("mongoose");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const { migrateAllowContact } = require("../../scripts/migrate-allowcontact-false");

const FIXED_TIME = new Date("2026-01-15T10:00:00Z");

// Raw inserts so the stored values (and timestamps) are exactly what older profiles had.
const insertProfile = async (recruiterPreferences, extra = {}) => {
  const doc = {
    userId: new mongoose.Types.ObjectId(),
    professionalHeadline: "Fake Headline For Tests",
    currentEmployment: { company: "Fake Corp", jobTitle: "Fake Engineer" },
    ...(recruiterPreferences ? { recruiterPreferences } : {}),
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    ...extra,
  };
  const { insertedId } = await ProfessionalProfile.collection.insertOne(doc);
  return insertedId;
};
const read = (id) => ProfessionalProfile.collection.findOne({ _id: id });

describe("migrate-allowcontact-false script", () => {
  const log = () => {};

  it("dry run changes nothing; --apply turns true into false and leaves everything else alone", async () => {
    const allowed = await insertProfile({ allowContact: true, preferredContactMethod: "LinkedIn" });
    const alsoAllowed = await insertProfile({ allowContact: true, preferredContactMethod: "Email" });
    const optedOut = await insertProfile({ allowContact: false, preferredContactMethod: "Phone" });
    const missing = await insertProfile(null);
    const before = await read(allowed);

    const dry = await migrateAllowContact({ log });
    expect(dry).toEqual({ matched: 2, updated: 0 });
    expect((await read(allowed)).recruiterPreferences.allowContact).toBe(true);

    const applied = await migrateAllowContact({ apply: true, log });
    expect(applied).toEqual({ matched: 2, updated: 2 });

    const after = await read(allowed);
    expect(after.recruiterPreferences).toEqual({ allowContact: false, preferredContactMethod: "LinkedIn" });
    // Nothing else on the document changed, timestamps included.
    const { recruiterPreferences: _a, ...restAfter } = after;
    const { recruiterPreferences: _b, ...restBefore } = before;
    expect(restAfter).toEqual(restBefore);
    expect(after.updatedAt).toEqual(FIXED_TIME);

    expect((await read(alsoAllowed)).recruiterPreferences.allowContact).toBe(false);
    expect((await read(optedOut)).recruiterPreferences).toEqual({ allowContact: false, preferredContactMethod: "Phone" });
    expect((await read(optedOut)).updatedAt).toEqual(FIXED_TIME);
    expect((await read(missing)).recruiterPreferences).toBeUndefined();

    // Running it again finds nothing to do.
    expect(await migrateAllowContact({ apply: true, log })).toEqual({ matched: 0, updated: 0 });
  });

  it("logs counts only, never names or emails", async () => {
    await insertProfile({ allowContact: true }, { personalEmail: "fake.person@example.test", fullName: "Fake Person" });
    const lines = [];
    await migrateAllowContact({ apply: true, log: (line) => lines.push(line) });
    const output = lines.join("\n");
    expect(output).toMatch(/1 professional profile/);
    expect(output).not.toMatch(/example\.test|Fake Person/);
  });

  it("leaves profiles created on or after --before alone (they chose after the deploy)", async () => {
    const old = await insertProfile({ allowContact: true });
    const fresh = await insertProfile({ allowContact: true }, { createdAt: new Date("2026-10-07T10:00:00Z") });

    await migrateAllowContact({ apply: true, before: new Date("2026-10-06"), log });

    expect((await read(old)).recruiterPreferences.allowContact).toBe(false);
    expect((await read(fresh)).recruiterPreferences.allowContact).toBe(true);
  });
});
