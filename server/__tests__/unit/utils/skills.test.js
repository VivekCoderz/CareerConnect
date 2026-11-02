const { normalizeSkill, isSoftSkill, splitOtherSkills, normalizedSkillSet, mergeSkillStrings } = require("../../../utils/skills");
const { analyzeSkillGap } = require("../../../controllers/studentController");

describe("skill helpers (T02, T03)", () => {
  it("treats different spellings of a skill as the same skill", () => {
    expect(normalizeSkill("React.js")).toBe(normalizeSkill("React"));
    expect(normalizeSkill("ReactJS")).toBe(normalizeSkill("react"));
    expect(normalizeSkill("Express.js")).toBe(normalizeSkill("Express"));
    expect(normalizeSkill("Node.js")).toBe(normalizeSkill("NodeJS"));
    expect(normalizeSkill("RESTful APIs")).toBe(normalizeSkill("REST API"));
    expect(normalizeSkill("Tailwind CSS")).toBe(normalizeSkill("tailwind"));
    expect(normalizeSkill("C++")).not.toBe(normalizeSkill("C"));
  });

  it("keeps the technical skills from Tripti's resume out of Soft Skills", () => {
    const other = ["HTML5", "CSS3", "RESTful APIs", "JWT Authentication", "NumPy", "Pandas",
      "Data Structures and Algorithms", "Object-Oriented Programming", "DBMS", "Operating Systems",
      "Computer Networks", "Problem Solving", "Teamwork"];

    const { technical, soft } = splitOtherSkills(other);

    expect(soft).toEqual(["Teamwork"]);
    expect(technical).toContain("HTML5");
    expect(technical).toContain("DBMS");
    expect(technical).toContain("Problem Solving"); // CC-02
    expect(technical).toHaveLength(12);
  });

  it("classifies every spelling of a skill the same way (CC-02)", () => {
    for (const name of ["Problem Solving", "problem solving", "Problem-Solving", " PROBLEM_SOLVING ", "ProblemSolving"]) {
      expect(isSoftSkill(name)).toBe(false);
    }
    for (const name of ["Teamwork", "Team-Work", "team work", "Time Management", "time-management", "Self Motivated"]) {
      expect(isSoftSkill(name)).toBe(true);
    }
  });

  it("does not recommend skills the student already has under another spelling", () => {
    const gap = analyzeSkillGap({
      careerGoal: "Full Stack Developer",
      technicalSkills: ["React.js", "Express.js", "Node.js", "MongoDB", "JavaScript", "Git", "Tailwind CSS"],
      softSkills: ["RESTful APIs"],
    });

    expect(gap.recommendedToLearn).not.toContain("React");
    expect(gap.recommendedToLearn).not.toContain("Express");
    expect(gap.recommendedToLearn).not.toContain("REST API");
    expect(gap.recommendedToLearn).toEqual(["TypeScript"]);
  });

  it("builds a set of normalised names", () => {
    expect(normalizedSkillSet(["React.js", "", null]).has("react")).toBe(true);
  });
});

describe("mergeSkillStrings (Q08)", () => {
  it("does not duplicate a student's existing skills, even under another spelling", () => {
    const existing = ["React.js", "Node.js", "MongoDB"];

    const merged = mergeSkillStrings(existing, ["react", "NodeJS", "mongodb", "Express", "express.js"]);

    expect(merged).toEqual(["React.js", "Node.js", "MongoDB", "Express"]);
  });

  it("keeps a fresher's existing { name } skills and adds only new ones as { name }", () => {
    const existing = [{ name: "JavaScript", proficiency: "Advanced" }, { name: "Git", proficiency: "Beginner" }];

    const merged = mergeSkillStrings(existing, ["javascript", "JS", "Docker", "git"], { asObjects: true });

    expect(merged).toEqual([
      { name: "JavaScript", proficiency: "Advanced" },
      { name: "Git", proficiency: "Beginner" },
      { name: "Docker" },
    ]);
  });

  it("returns { name } items for a professional with no skills yet", () => {
    expect(mergeSkillStrings([], ["Python", " ", "python"], { asObjects: true })).toEqual([{ name: "Python" }]);
  });

  it("does not change the existing array", () => {
    const existing = ["SQL"];
    mergeSkillStrings(existing, ["Java"]);
    expect(existing).toEqual(["SQL"]);
  });
});
