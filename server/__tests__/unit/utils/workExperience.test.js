const { isWorkExperienceAllowed } = require("../../../utils/workExperience");

describe("isWorkExperienceAllowed (bug 4: freshers have at most 2 years)", () => {
  it("allows 0 to 2 years for a fresher", () => {
    expect(isWorkExperienceAllowed("fresher", "0 years")).toBe(true);
    expect(isWorkExperienceAllowed("fresher", "1 year")).toBe(true);
    expect(isWorkExperienceAllowed("fresher", "2 years")).toBe(true);
    expect(isWorkExperienceAllowed("fresher", 1)).toBe(true);
  });

  it("refuses more than 2 years, open-ended and unreadable values for a fresher", () => {
    expect(isWorkExperienceAllowed("fresher", "3 years")).toBe(false);
    expect(isWorkExperienceAllowed("fresher", "5+ years")).toBe(false);
    expect(isWorkExperienceAllowed("fresher", "2+ years")).toBe(false);
    expect(isWorkExperienceAllowed("fresher", "lots")).toBe(false);
    expect(isWorkExperienceAllowed("fresher", "-1")).toBe(false);
  });

  it("does not limit students or working professionals", () => {
    expect(isWorkExperienceAllowed("professional", "5+ years")).toBe(true);
    expect(isWorkExperienceAllowed("student", "0 years")).toBe(true);
  });
});
