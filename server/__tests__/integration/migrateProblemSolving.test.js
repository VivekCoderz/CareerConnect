// One-time migration (CC-02): Problem Solving moves from soft skills to technical skills.
const mongoose = require("mongoose");
const StudentProfile = require("../../models/StudentProfile");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const { migrateProblemSolving } = require("../../scripts/migrate-problem-solving-technical");

const FIXED_TIME = new Date("2026-01-15T10:00:00Z");

// Raw inserts so the stored values (and timestamps) are exactly what older profiles had.
const insert = async (Model, fields) => {
  const { insertedId } = await Model.collection.insertOne({
    userId: new mongoose.Types.ObjectId(),
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    ...fields,
  });
  return insertedId;
};
const read = (Model, id) => Model.collection.findOne({ _id: id });

describe("migrate-problem-solving-technical script", () => {
  const log = () => {};

  it("dry run changes nothing; --apply moves every spelling to the technical list", async () => {
    const student = await insert(StudentProfile, {
      technicalSkills: ["React"],
      softSkills: ["Communication", "problem-solving", "Teamwork"],
    });
    const fresher = await insert(FresherProfile, {
      skills: {
        technical: [{ name: "REST API", proficiency: "Beginner" }],
        softSkills: [{ name: "Problem Solving", proficiency: "Advanced" }, { name: "Teamwork", proficiency: "Intermediate" }],
      },
    });
    const professional = await insert(ProfessionalProfile, {
      skills: { management: [], softSkills: [{ name: "PROBLEM SOLVING", proficiency: "Expert" }] },
    });
    const untouched = await insert(StudentProfile, { technicalSkills: [], softSkills: ["Problem statements"] });

    const dry = await migrateProblemSolving({ log });
    expect(dry.student).toEqual({ matched: 1, updated: 0 });
    expect((await read(StudentProfile, student)).softSkills).toContain("problem-solving");

    const applied = await migrateProblemSolving({ apply: true, log });
    expect(applied).toEqual({
      student: { matched: 1, updated: 1 },
      fresher: { matched: 1, updated: 1 },
      professional: { matched: 1, updated: 1 },
    });

    const s = await read(StudentProfile, student);
    expect(s.softSkills).toEqual(["Communication", "Teamwork"]);
    expect(s.technicalSkills).toEqual(["React", "problem-solving"]);
    expect(s.updatedAt).toEqual(FIXED_TIME);

    const f = await read(FresherProfile, fresher);
    expect(f.skills.softSkills).toEqual([{ name: "Teamwork", proficiency: "Intermediate" }]);
    expect(f.skills.technical).toEqual([
      { name: "REST API", proficiency: "Beginner" },
      { name: "Problem Solving", proficiency: "Advanced" },
    ]);

    const p = await read(ProfessionalProfile, professional);
    expect(p.skills.softSkills).toEqual([]);
    expect(p.skills.management).toEqual([{ name: "PROBLEM SOLVING", proficiency: "Expert" }]);

    expect((await read(StudentProfile, untouched)).softSkills).toEqual(["Problem statements"]);

    // Re-running finds nothing left to move.
    expect((await migrateProblemSolving({ apply: true, log })).student).toEqual({ matched: 0, updated: 0 });
  });

  it("does not add a duplicate when the technical list already has it", async () => {
    const student = await insert(StudentProfile, {
      technicalSkills: ["Problem Solving"],
      softSkills: ["Problem Solving"],
    });

    await migrateProblemSolving({ apply: true, log });

    const s = await read(StudentProfile, student);
    expect(s.technicalSkills).toEqual(["Problem Solving"]);
    expect(s.softSkills).toEqual([]);
  });
});
