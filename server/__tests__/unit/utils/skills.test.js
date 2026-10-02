const { normalizeSkill, splitOtherSkills, normalizedSkillSet } = require("../../../utils/skills");
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

    expect(soft).toEqual(["Problem Solving", "Teamwork"]);
    expect(technical).toContain("HTML5");
    expect(technical).toContain("DBMS");
    expect(technical).toHaveLength(11);
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
