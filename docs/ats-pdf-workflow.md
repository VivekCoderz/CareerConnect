# Resume compatibility PDF workflow

The resume review page accepts two text-based PDFs: a job description and the resume intended for that job. The server extracts text from both files, calculates a 100-point CareerConnect match estimate, and returns a four-part score breakdown with matched and missing requirements. It does not use saved profile data when checking an uploaded resume.

When the score is below 70, the user can request a rebuild. The server groups the uploaded resume into a single-column LaTeX document, escapes TeX control characters, compiles the document with Tectonic in untrusted mode, extracts text from the resulting PDF, and checks the same JD again. It also checks that at least 95% of distinct source words remain in the generated PDF. The improved PDF is offered only when its measured score is at least 70 and at least 15 points above the original. A score of 80 is shown as a further goal, not a hard gate for freshers. If formatting alone cannot reach the release target, the UI shows the actual score and missing requirements and lets the user confirm real skills or add coursework, academic projects, volunteering, or work details absent from the upload. The server includes only these user-confirmed details in the next rebuild; it does not invent qualifications.

Professional work experience is optional. The score recognizes relevant coursework and academic projects as evidence. A fresher can select JD skills they genuinely have but omitted from the upload, confirm the claim, and rebuild without entering work experience. The API rejects selected skills that were not identified as missing JD skills, and the generated PDF is rescored before download.

The score is an estimate made by CareerConnect. It is not an official score from an employer's applicant tracking system. The same uploaded PDF and JD will receive the same score from this workflow.

## Runtime setup

Install the `tectonic` executable on every server or worker that handles `/api/resume/ats-pdf/optimize` to use the LaTeX renderer. Set `TECTONIC_PATH` if the executable is not on `PATH`. Tectonic downloads its LaTeX bundle on the first compilation, so prewarm its cache during deployment. Set `TECTONIC_CACHE_DIR` to a writable persistent directory when possible. If compilation is unavailable, the service renders the same extracted source text using its built-in PDF renderer. The service limits concurrent compilations to two per Node process and rejects additional requests with HTTP 503. For sustained traffic, put compilation behind a shared job queue and scale workers separately from the API.

Local macOS setup:

```sh
brew install tectonic
node server/scripts/verify-ats-pdf-workflow.js
```

The verification script creates synthetic PDFs in `tmp/pdfs`, compiles a LaTeX resume, extracts its text, and prints the before and after scores and content preservation ratio. It does not use account data. For visual review, render `tmp/pdfs/ats-synthetic-generated.pdf` with Poppler or a PDF viewer.

## Limits and safeguards

- Both uploads must be PDFs, each at most 10 MB. Scanned image PDFs without selectable text are rejected.
- The compiler receives escaped source text through a fixed template. `--untrusted` disables known dangerous TeX features, and compilation has a time limit.
- The generated resume contains no added qualifications, employers, dates, metrics, or skills. It may organize text that was already present.
- No generated PDF is stored in the account automatically. The browser receives a temporary download link for the current session.
