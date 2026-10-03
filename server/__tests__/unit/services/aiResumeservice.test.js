const { normalizeResumeCandidateData } = require("../../../services/aiResumeservice");

const EMPTY_CANDIDATE = {
  personal: { fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
  summary: "",
  skills: { programmingLanguages: "", frameworks: "", tools: "", other: "" },
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  achievements: [],
};

describe("normalizeResumeCandidateData with no resume (Q08 EMPTY_RAW)", () => {
  it.each([null, undefined, ""])("returns an empty candidate for %p instead of crashing", (input) => {
    expect(normalizeResumeCandidateData(input)).toEqual(EMPTY_CANDIDATE);
  });

  it("has the same keys as a normalized real resume", () => {
    const empty = normalizeResumeCandidateData(null);
    const real = normalizeResumeCandidateData({ personal: { fullName: "Asha" }, summary: "Developer" });

    expect(Object.keys(empty).sort()).toEqual(Object.keys(real).sort());
    expect(Object.keys(empty.personal).sort()).toEqual(Object.keys(real.personal).sort());
    expect(Object.keys(empty.skills).sort()).toEqual(Object.keys(real.skills).sort());
  });

  it("returns a fresh copy each time", () => {
    const first = normalizeResumeCandidateData(null);
    first.summary = "changed";
    first.experience.push({ company: "Acme" });

    expect(normalizeResumeCandidateData(null)).toEqual(EMPTY_CANDIDATE);
  });
});
