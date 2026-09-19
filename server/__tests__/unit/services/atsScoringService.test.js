const { analyzeATSMatch, parseJobDescriptionText } = require("../../../services/atsScoringService");

describe("ATS scoring service", () => {
  const opportunity = {
    title: "Frontend Developer",
    description: "Build accessible React applications using JavaScript, REST APIs, Git and Docker.",
    requiredSkills: ["React", "JavaScript", "REST API", "Docker"],
    responsibilities: ["Develop reusable components", "Collaborate using Git"],
  };

  it("returns an explainable score with matched and missing skills", () => {
    const result = analyzeATSMatch({
      personal: { fullName: "Test Candidate", email: "candidate@example.com" },
      summary: "Frontend developer focused on accessible React applications.",
      skills: { frameworks: ["React"], programmingLanguages: ["JavaScript"], tools: ["Git"] },
      projects: [{ name: "Portal", description: "Built reusable React components and REST API integrations." }],
      education: [{ degree: "B.Tech" }],
    }, opportunity);

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["react", "javascript", "rest api", "git"]));
    expect(result.missingSkills).toContain("docker");
    expect(result.sections.skills).toBeLessThanOrEqual(result.sectionMaximums.skills);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("scores a genuinely stronger resume above a weak resume", () => {
    const weak = analyzeATSMatch({ personal: { fullName: "Candidate" } }, opportunity);
    const strong = analyzeATSMatch({
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      summary: "Frontend Developer with React and JavaScript experience.",
      skills: { frameworks: ["React"], programmingLanguages: ["JavaScript"], tools: ["Git", "Docker"], other: ["REST API"] },
      experience: [{ role: "Frontend Developer", description: "Developed reusable React applications and improved delivery by 20%." }],
      projects: [{ name: "Web Platform", description: "Built REST API integrations." }],
      education: [{ degree: "B.Tech" }],
    }, opportunity);

    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
  });

  it("extracts an editable title and known skills from job description text", () => {
    const parsed = parseJobDescriptionText(`
      Job Title: Backend Engineer
      We need a developer to build REST APIs using Node.js, Express, MongoDB and Docker.
      The engineer will collaborate through Git and write integration testing.
    `);

    expect(parsed.title).toBe("Backend Engineer");
    expect(parsed.description).toContain("build REST APIs");
    expect(parsed.requiredSkills).toEqual(expect.arrayContaining([
      "node.js", "express", "mongodb", "docker", "git", "rest api", "testing",
    ]));
  });
});
