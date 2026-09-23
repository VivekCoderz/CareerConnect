const {
  analyzeATSMatch,
  assessATSResumeFormat,
  assessContentPreservation,
  parseJobDescriptionText,
  selectBestATSResume,
} = require("../../../services/atsScoringService");

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

  it("never selects a tailored resume with a lower ATS score than its source", () => {
    const original = {
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      summary: "Frontend developer with React and JavaScript experience.",
      skills: { frameworks: ["React"], programmingLanguages: ["JavaScript"], tools: ["Git"] },
      projects: [{ name: "Portal", description: "Built reusable React components and REST APIs." }],
      education: [{ degree: "B.Tech" }],
    };
    const weakerCandidate = { personal: original.personal, skills: { tools: ["Git"] } };
    const selected = selectBestATSResume(original, [{ source: "ai", data: weakerCandidate }], opportunity);

    expect(selected.source).toBe("original");
    expect(selected.comparison.tailoredScore).toBe(selected.comparison.originalScore);
  });

  it("rejects a candidate that improves the score by fewer than five points", () => {
    const original = {
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      summary: "Frontend developer building accessible applications with React.",
      skills: { frameworks: ["React"], programmingLanguages: ["JavaScript"], tools: ["Git"] },
      projects: [{ name: "Portal", description: ["Built accessible React components."] }],
      education: [{ degree: "B.Tech" }],
    };
    const marginalCandidate = {
      ...original,
      summary: `${original.summary} Developed reusable interfaces.`,
    };

    const originalScore = analyzeATSMatch(original, opportunity).overallScore;
    const candidateScore = analyzeATSMatch(marginalCandidate, opportunity).overallScore;
    expect(candidateScore).toBeGreaterThan(originalScore);
    expect(candidateScore - originalScore).toBeLessThan(5);

    const selected = selectBestATSResume(
      original,
      [{ source: "marginal", data: marginalCandidate }],
      opportunity
    );

    expect(selected.source).toBe("original");
    expect(selected.comparison.minimumScoreImprovement).toBe(5);
    expect(selected.comparison.scoreImprovement).toBe(0);
  });

  it("makes every score point traceable to the documented weighted sections", () => {
    const result = analyzeATSMatch({
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      summary: "Frontend developer with verified React project experience.",
      skills: { frameworks: ["React"] },
      projects: [{ name: "Portal", description: ["Built reusable React components."] }],
      education: [{ degree: "B.Tech" }],
    }, opportunity);

    expect(Object.values(result.sections).reduce((total, score) => total + score, 0)).toBe(result.overallScore);
    expect(Object.values(result.sectionMaximums).reduce((total, score) => total + score, 0)).toBe(100);
  });

  it("separates resume format readiness from job matching", () => {
    const ready = assessATSResumeFormat({
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      summary: "Frontend developer with verified experience building accessible applications.",
      skills: { frameworks: ["React"] },
      education: [{ degree: "B.Tech" }],
      projects: [{ name: "Portal", description: ["Built reusable components."] }],
    });
    const incomplete = assessATSResumeFormat({ personal: { fullName: "Candidate" } });

    expect(ready.isProperFormat).toBe(true);
    expect(incomplete.isProperFormat).toBe(false);
    expect(incomplete.issues.length).toBeGreaterThan(0);
  });

  it("rejects regenerated resumes that drop verified source sections", () => {
    const source = {
      personal: { fullName: "Candidate", email: "candidate@example.com", phone: "9999999999" },
      skills: { frameworks: ["React"], tools: ["Git"] },
      internships: [{ company: "Example", role: "Intern", description: ["Built a portal."] }],
      projects: [{ name: "Portal", description: ["Built reusable components."] }],
      education: [{ degree: "B.Tech" }],
      certifications: [{ name: "React" }],
    };
    const incompleteCandidate = {
      personal: { fullName: "Candidate", email: "candidate@example.com" },
      skills: { frameworks: ["React"] },
      projects: source.projects,
    };

    const result = assessContentPreservation(source, incompleteCandidate);
    expect(result.passed).toBe(false);
    expect(result.missing.join(" ")).toContain("experience and internships");
    expect(result.missing.join(" ")).toContain("contact field: phone");
  });
});
