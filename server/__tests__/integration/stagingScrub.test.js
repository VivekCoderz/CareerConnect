// H02: staging is built from a production backup with personal data scrubbed, never touches the
// production database, and never emails real people.
const mongoose = require("mongoose");
const { scrubDatabase, findLeftovers, createScrubber } = require("../../scripts/staging/scrubPersonalData");
const { assertDatabaseMatchesEnvironment, isEmailAllowed, databaseName } = require("../../config/environment");

const db = () => mongoose.connection.db;

afterEach(async () => {
  for (const { name } of await db().listCollections({}, { nameOnly: true }).toArray()) {
    await db().collection(name).deleteMany({});
  }
});

describe("staging scrub", () => {
  const seed = async () => {
    await db().collection("users").insertOne({
      fullName: "Rahul Sharma", firstName: "Rahul", lastName: "Sharma", username: "rahul_s",
      email: "rahul.sharma@gmail.com", phone: "9876543210", password: "$2a$10$hash", firebaseUid: "abc",
      dateOfBirth: new Date("2001-01-01"), status: "active", userType: "student",
      socialLinks: { linkedin: "https://linkedin.com/in/rahul" }, profileImage: "https://res.cloudinary.com/x.jpg",
    });
    await db().collection("applications").insertOne({
      studentEmail: "rahul.sharma@gmail.com", studentPhone: "+91 9876543210", status: "applied",
      coverLetter: "Hi, I am Rahul Sharma and I would love to join. Call 9876543210.",
    });
    await db().collection("jobs").insertOne({ title: "Sales Executive", salary: "60000-90000", status: "active" });
    await db().collection("sessions").insertOne({ session: "secret" });
  };

  it("replaces emails, phones and names everywhere and keeps the rest", async () => {
    await seed();
    const { tokens } = await scrubDatabase(db());
    const user = await db().collection("users").findOne({});
    const application = await db().collection("applications").findOne({});
    const job = await db().collection("jobs").findOne({});

    expect(user.email).toMatch(/^user-[0-9a-f]{12}@staging\.invalid$/);
    expect(application.studentEmail).toBe(user.email); // same person, same fake email
    expect(user.phone).toBe("6000000001");
    expect(application.studentPhone).toBe("6000000001");
    expect(user.fullName).toMatch(/^Test User [0-9a-f]{6}$/);
    expect(user.username).toMatch(/^user_[0-9a-f]{12}$/);
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("firebaseUid");
    expect(user).not.toHaveProperty("dateOfBirth");
    expect(user.hasPassword).toBe(false);
    expect(user.profileImage).toBe("");
    expect(user.socialLinks.linkedin).toBe("");
    expect(user.status).toBe("active");
    expect(application.coverLetter).toBe("Hi, I am Test Test and I would love to join. Call 6000000001.");
    expect(job).toMatchObject({ title: "Sales Executive", salary: "60000-90000", status: "active" });
    expect(await db().collection("sessions").countDocuments()).toBe(0);
    expect(await findLeftovers(db(), tokens)).toEqual({});
  });

  it("reports personal data that is still there", async () => {
    await seed();
    expect(await findLeftovers(db())).toMatchObject({
      users: { emails: 1, phones: 1 },
      applications: { emails: 1, phones: 2 },
    });
  });

  it("does not replace a name word inside a one-word value", () => {
    const { scrubString } = createScrubber(["Active"]);
    expect(scrubString("active")).toBe("active");
    expect(scrubString("Active Kumar applied")).toBe("Test Kumar applied");
  });
});

describe("staging environment guard", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reads the database name from a connection string", () => {
    expect(databaseName("mongodb+srv://u:p@cluster.mongodb.net/careerconnect_staging?retryWrites=true")).toBe("careerconnect_staging");
    expect(databaseName("mongodb+srv://u:p@cluster.mongodb.net/?retryWrites=true")).toBe("");
  });

  it("stops staging from using a non-staging database", () => {
    process.env.APP_ENV = "staging";
    expect(() => assertDatabaseMatchesEnvironment("mongodb+srv://u:p@prod.mongodb.net/careerconnect")).toThrow(/Refusing/);
    expect(() => assertDatabaseMatchesEnvironment("mongodb+srv://u:p@stg.mongodb.net/careerconnect_staging")).not.toThrow();
  });

  it("stops production from using the staging database", () => {
    delete process.env.APP_ENV;
    process.env.NODE_ENV = "production";
    expect(() => assertDatabaseMatchesEnvironment("mongodb+srv://u:p@stg.mongodb.net/careerconnect_staging")).toThrow(/Refusing/);
    expect(() => assertDatabaseMatchesEnvironment("mongodb+srv://u:p@prod.mongodb.net/careerconnect")).not.toThrow();
  });

  it("only emails allowlisted addresses on staging", () => {
    expect(isEmailAllowed("anyone@gmail.com")).toBe(true);
    process.env.APP_ENV = "staging";
    process.env.STAGING_EMAIL_ALLOWLIST = "@e2job.com, tester@gmail.com";
    expect(isEmailAllowed("vivek@e2job.com")).toBe(true);
    expect(isEmailAllowed("tester@gmail.com")).toBe(true);
    expect(isEmailAllowed("someone@gmail.com")).toBe(false);
    expect(isEmailAllowed("user-abc@staging.invalid")).toBe(false);
  });
});
