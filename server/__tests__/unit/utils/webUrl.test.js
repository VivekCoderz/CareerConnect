const { webUrlOrEmpty } = require("../../../utils/webUrl");

describe("webUrlOrEmpty (QA bugs 2 and 3)", () => {
  it("keeps real web addresses and adds https", () => {
    expect(webUrlOrEmpty("https://github.com/asha/repo")).toBe("https://github.com/asha/repo");
    expect(webUrlOrEmpty("github.com/asha/repo")).toBe("https://github.com/asha/repo");
    expect(webUrlOrEmpty(" linkedin.com/in/asha ")).toBe("https://linkedin.com/in/asha");
  });

  it("drops labels and junk instead of saving them as links", () => {
    expect(webUrlOrEmpty("GitHub")).toBe("");
    expect(webUrlOrEmpty("Live Demo")).toBe("");
    expect(webUrlOrEmpty("javascript:alert(1)")).toBe("");
    expect(webUrlOrEmpty(undefined)).toBe("");
  });
});
