const {
  scorePdfText,
  createLatexResume,
  escapeLatex,
  preservedSourceText,
} = require("../../../services/atsPdfWorkflow");

const jd = `Job Title: Full Stack Engineer
Build React and Node.js applications using JavaScript, Express, MongoDB, Docker, Git and REST API.`;

describe("PDF ATS workflow", () => {
  it("scores only resume PDF text and keeps missing skills visible", () => {
    const source = `Test Candidate
candidate@example.com
Skills
React, JavaScript, Node.js, Express, MongoDB, Git
Projects
Built a student portal with React and a REST API.
Education
Bachelor of Technology, Example University`;
    const result = scorePdfText(source, jd);
    expect(result.matchedSkills).toContain("react");
    expect(result.missingSkills).toContain("docker");
    expect(Object.values(result.sections).reduce((sum, value) => sum + value, 0)).toBe(result.atsScore);
    expect(result.atsScore).toBe(scorePdfText(source, jd).atsScore);
  });

  it("recognizes documented skill aliases instead of treating them as missing", () => {
    const result = scorePdfText(
      "Test Candidate\ncandidate@example.com\nSkills\nNode and RESTful services\nExperience\nBuilt a service using Node and RESTful services.\nEducation\nExample University",
      "Job Title: Backend Engineer\nRequired: Node.js and REST API."
    );
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["node.js", "rest api"]));
    expect(result.missingSkills).not.toContain("node.js");
  });

  it("counts academic coursework as relevant evidence for a fresher", () => {
    const result = scorePdfText(
      "Test Student\nstudent@example.com\nSkills\nReact, JavaScript\nCoursework\nCompleted a React and JavaScript web application in university coursework.\nEducation\nBachelor of Technology, Example University",
      jd
    );
    expect(result.sections.evidence).toBeGreaterThan(0);
    expect(result.scoreParameters.find((item) => item.key === "evidence").label).toContain("coursework");
  });

  it("escapes PDF supplied LaTeX commands and retains original evidence", () => {
    const source = `Test Candidate
candidate@example.com
React, JavaScript
Built a project with \\input{secret} and 20% improvement.`;
    const latex = createLatexResume(source, jd);
    expect(latex).toContain("\\textbackslash{}input\\{secret\\}");
    expect(latex).toContain("20\\% improvement");
    expect(latex).toContain("Built a project");
    expect(latex).not.toContain("Docker");
    expect(escapeLatex("a&b_c")).toBe("a\\&b\\_c");
  });

  it("rejects a generated document that drops source vocabulary", () => {
    const source = "Built a student portal using React, Express and MongoDB.";
    expect(preservedSourceText(source, "React resume").ratio).toBeLessThan(0.95);
    expect(preservedSourceText(source, source).ratio).toBe(1);
  });
});
