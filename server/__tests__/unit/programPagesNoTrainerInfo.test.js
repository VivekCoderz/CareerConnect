// C13/C14: the career programme pages must not show trainer names, batch dates or class
// timings; the team shares those on the call after an enquiry. This reads the client's
// programme files (data, pages, components) and fails if any of that shows up outside
// comments, e.g. a new "trainer" field in the data or a "Batch starts" label.
const fs = require("fs");
const path = require("path");

const CLIENT_SRC = path.join(__dirname, "../../../client/src");
const FILES = [
  "data/programs.js",
  "pages/programs/ProgramsPage.jsx",
  "pages/programs/ProgramDetailPage.jsx",
  "components/programs/ProgramsLayout.jsx",
  "components/programs/ProgramEnquiryForm.jsx",
];
const FORBIDDEN = /\b(trainers?|instructors?|faculty|batch(es)?|timings?|schedules?|start\s*dates?|class\s*times?)\b/i;

// Line comments are dropped only when // starts the line or follows whitespace, so URLs survive.
const withoutComments = (source) =>
  source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

describe("career programme pages (C13/C14)", () => {
  it.each(FILES)("%s has no trainer, batch or timing content", (file) => {
    const source = fs.readFileSync(path.join(CLIENT_SRC, file), "utf8");
    const match = withoutComments(source).match(FORBIDDEN);
    expect(match && match[0]).toBeNull();
  });

  it("the check itself catches a trainer field and a batch label", () => {
    expect(withoutComments('trainer: "Asha Rao",')).toMatch(FORBIDDEN);
    expect(withoutComments("<p>Next batch starts 1 Dec</p>")).toMatch(FORBIDDEN);
    expect(withoutComments("// no trainer fields on purpose")).not.toMatch(FORBIDDEN);
  });
});
