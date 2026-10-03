const fs = require("node:fs");
const path = require("node:path");
const PDFDocument = require("pdfkit");
const workflow = require("../services/atsPdfWorkflow");

const asPdf = (text) => new Promise((resolve) => {
  const document = new PDFDocument({ margin: 42 });
  const chunks = [];
  document.on("data", (chunk) => chunks.push(chunk));
  document.on("end", () => resolve(Buffer.concat(chunks)));
  document.fontSize(10).text(text);
  document.end();
});

async function main() {
  const source = await asPdf(`Test Candidate
candidate@example.com
JavaScript, React, Node.js, Express, MongoDB, Git
Built a student portal with React and JavaScript.
Developed REST API integrations using Node.js and Express.
Created data storage with MongoDB.
Bachelor of Technology, Example University, 2025`);
  const jd = await asPdf(`Job Title: Full Stack Engineer
We need React, JavaScript, Node.js, Express, MongoDB, Docker, Git, REST API.
Build accessible applications and maintain production services.`);
  const output = path.join(__dirname, "../../tmp/pdfs");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "ats-synthetic-original.pdf"), source);
  fs.writeFileSync(path.join(output, "ats-synthetic-jd.pdf"), jd);
  const [sourceText, jdText] = await Promise.all([
    workflow.extractPdfText(source), workflow.extractPdfText(jd),
  ]);
  const original = workflow.scorePdfText(sourceText, jdText);
  const latex = workflow.createLatexResume(sourceText, jdText);
  const generated = await workflow.compileLatex(latex);
  const generatedText = await workflow.extractPdfText(generated);
  const optimized = workflow.scorePdfText(generatedText, jdText);
  const preservation = workflow.preservedSourceText(sourceText, generatedText);
  fs.writeFileSync(path.join(output, "ats-synthetic-generated.pdf"), generated);
  fs.writeFileSync(path.join(output, "ats-synthetic-generated.tex"), latex);
  const { atsPdfCheckHandler, atsPdfOptimizeHandler } = require("../controllers/resumeController");
  const request = (resumeBuffer, additionalEvidence = "", confirmedSkills = []) => ({
    files: {
      resume: [{ buffer: resumeBuffer }],
      jobDescription: [{ buffer: jd }],
    },
    body: { additionalEvidence, confirmedSkills: JSON.stringify(confirmedSkills), claimsConfirmed: additionalEvidence || confirmedSkills.length ? "true" : undefined },
  });
  const invoke = async (handler, req) => {
    const response = { statusCode: 200 };
    response.status = (code) => { response.statusCode = code; return response; };
    response.json = (body) => { response.body = body; return response; };
    await handler(req, response);
    return response;
  };
  const check = await invoke(atsPdfCheckHandler, request(source));
  const verifiedEvidence = "Built Docker containers for deployment and maintained production services. Improved accessibility in React applications and delivered REST API services.";
  const build = await invoke(atsPdfOptimizeHandler, request(source, verifiedEvidence));
  const unrelated = await asPdf(`Test Candidate
candidate@example.com
Professional Summary
Accounting graduate with bookkeeping experience.
Skills
Excel, bookkeeping, reconciliation
Experience
Prepared monthly account reports and reviewed invoices.
Education
Bachelor of Commerce, Example University`);
  const unsupportedBuild = await invoke(atsPdfOptimizeHandler, request(unrelated));
  const fresherSource = await asPdf("Test Student\nstudent@example.com\nProfessional Summary\nComputer science graduate seeking a full stack role.\nSkills\nReact, JavaScript, Node.js, Git\nCoursework\nCompleted web development coursework using React and JavaScript.\nEducation\nBachelor of Technology, Example University");
  const fresherBuild = await invoke(atsPdfOptimizeHandler, request(fresherSource, "", ["express", "mongodb", "rest api", "docker"]));
  const invalidSkillBuild = await invoke(atsPdfOptimizeHandler, request(fresherSource, "", ["kubernetes"]));
  const stableJd = await asPdf("Job Title: Data Scientist\nRequired: Python, SQL, AWS, Docker, machine learning and data analysis.");
  const stableResume = await asPdf("Test Candidate\ncandidate@example.com\nProfessional Summary\nData analyst with SQL reporting experience.\nSkills\nPython, SQL\nExperience\nBuilt dashboard reports using Python and SQL.\nEducation\nBachelor of Technology, Example University");
  const stableBuild = await invoke(atsPdfOptimizeHandler, {
    files: { resume: [{ buffer: stableResume }], jobDescription: [{ buffer: stableJd }] },
    body: {},
  });
  const tectonicPath = process.env.TECTONIC_PATH;
  process.env.TECTONIC_PATH = path.join(__dirname, "missing-tectonic-binary");
  let fallbackBuild;
  try {
    fallbackBuild = await invoke(atsPdfOptimizeHandler, request(source, verifiedEvidence));
  } finally {
    if (tectonicPath === undefined) delete process.env.TECTONIC_PATH;
    else process.env.TECTONIC_PATH = tectonicPath;
  }
  const reupload = build.body?.pdfBase64
    ? await invoke(atsPdfCheckHandler, request(Buffer.from(build.body.pdfBase64, "base64")))
    : null;
  const fallbackReupload = fallbackBuild.body?.pdfBase64
    ? await invoke(atsPdfCheckHandler, request(Buffer.from(fallbackBuild.body.pdfBase64, "base64")))
    : null;
  const fresherReupload = fresherBuild.body?.pdfBase64
    ? await invoke(atsPdfCheckHandler, request(Buffer.from(fresherBuild.body.pdfBase64, "base64")))
    : null;
  const results = {
    originalScore: original.atsScore,
    generatedScore: optimized.atsScore,
    improvement: optimized.atsScore - original.atsScore,
    preservation,
    checkStatus: check.statusCode,
    optimizeStatus: build.statusCode,
    verifiedScore: build.body?.optimized?.atsScore,
    reuploadScore: reupload?.body?.atsScore,
    unrelatedBuildStatus: unsupportedBuild.statusCode,
    unrelatedErrorCode: unsupportedBuild.body?.code,
    unrelatedPdfBytes: unsupportedBuild.body?.pdfBase64 ? Buffer.from(unsupportedBuild.body.pdfBase64, "base64").length : 0,
    fresherStatus: fresherBuild.statusCode,
    fresherBefore: fresherBuild.body?.original?.atsScore,
    fresherAfter: fresherBuild.body?.optimized?.atsScore,
    fresherReuploadScore: fresherReupload?.body?.atsScore,
    invalidSkillStatus: invalidSkillBuild.statusCode,
    unchangedStatus: stableBuild.statusCode,
    unchangedBefore: stableBuild.body?.original?.atsScore,
    unchangedAfter: stableBuild.body?.optimized?.atsScore,
    fallbackStatus: fallbackBuild.statusCode,
    fallbackPdfBytes: fallbackBuild.body?.pdfBase64 ? Buffer.from(fallbackBuild.body.pdfBase64, "base64").length : 0,
    fallbackScore: fallbackBuild.body?.optimized?.atsScore,
    fallbackReuploadScore: fallbackReupload?.body?.atsScore,
  };
  console.log(JSON.stringify(results, null, 2));
  if (preservation.ratio < 0.95 || results.improvement < 15 ||
      results.checkStatus !== 200 || results.optimizeStatus !== 200 ||
      results.verifiedScore < Math.max(70, original.atsScore + 15) ||
      results.reuploadScore !== results.verifiedScore ||
      results.unrelatedBuildStatus !== 409 || results.unrelatedErrorCode !== "INSUFFICIENT_EVIDENCE" ||
      results.fresherStatus !== 200 || results.fresherAfter < Math.max(70, results.fresherBefore + 15) ||
      results.fresherReuploadScore !== results.fresherAfter || results.invalidSkillStatus !== 400 ||
      results.unrelatedPdfBytes || results.unchangedStatus !== 409 ||
      results.unchangedBefore !== results.unchangedAfter || results.fallbackStatus !== 200 ||
      !results.fallbackPdfBytes || results.fallbackScore < Math.max(70, original.atsScore + 15) ||
      results.fallbackReuploadScore !== results.fallbackScore) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
