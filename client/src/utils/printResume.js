const PRINT_DOCUMENT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm 14mm;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: Calibri, Arial, Helvetica, sans-serif;
  }

  .resume-print-document {
    width: 182mm;
    max-width: 182mm;
    margin: 0 auto;
    padding: 0;
    background: #ffffff;
  }

  .resume-print-document .ats-resume-container {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    font-size: 10.5pt !important;
    line-height: 1.4 !important;
  }

  .resume-print-document .no-print {
    display: none !important;
  }

  .resume-print-document .resume-entry,
  .resume-print-document .break-inside-avoid {
    break-inside: avoid-page !important;
    page-break-inside: avoid !important;
  }

  .resume-print-document .resume-section {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  .resume-print-document .resume-entry,
  .resume-print-document h1,
  .resume-print-document h2 {
    orphans: 3;
    widows: 3;
  }

  .resume-print-document .resume-contact-row {
    display: flex !important;
    flex-flow: row wrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px 8px !important;
    width: 100% !important;
  }

  .resume-print-document .resume-contact-row.is-modern {
    justify-content: flex-start !important;
  }

  .resume-print-document .resume-contact-item,
  .resume-print-document .resume-contact-link,
  .resume-print-document .resume-contact-separator {
    display: inline-block !important;
    white-space: nowrap !important;
  }

  .resume-print-document a {
    color: inherit !important;
    text-decoration: none !important;
  }

  .resume-print-document a[href]::after {
    content: "" !important;
  }

  @media screen {
    body {
      padding: 24px;
      background: #e2e8f0;
    }

    .resume-print-document {
      min-height: 273mm;
      padding: 12mm 14mm;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.16);
    }
  }

  @media print {
    .resume-print-document {
      width: 100%;
      max-width: none;
    }
  }
`;

const collectDocumentStyles = () => Array.from(
  document.querySelectorAll('link[rel="stylesheet"], style')
).map((element) => element.outerHTML).join("\n");

export const printResumeDocument = (previewElement, documentTitle = "ATS Optimized Resume") => {
  const resumeElement = previewElement?.querySelector(".ats-resume-container") || previewElement;
  if (!resumeElement) {
    throw new Error("The resume preview is not ready to print.");
  }

  const printWindow = window.open("", "_blank", "width=960,height=1200");
  if (!printWindow) {
    throw new Error("Your browser blocked the print window. Allow pop-ups for this site and try again.");
  }

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${documentTitle.replace(/[<>]/g, "")}</title>
        ${collectDocumentStyles()}
        <style>${PRINT_DOCUMENT_STYLES}</style>
      </head>
      <body>
        <main class="resume-print-document">${resumeElement.outerHTML}</main>
      </body>
    </html>`);
  let printScheduled = false;
  const openPrintDialog = () => {
    if (printScheduled) return;
    printScheduled = true;
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const waitForFontsAndPrint = () => {
    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(openPrintDialog).catch(openPrintDialog);
    } else {
      openPrintDialog();
    }
  };

  printWindow.addEventListener("load", waitForFontsAndPrint, { once: true });
  printWindow.document.close();

  // Covers browsers that do not fire a second load event for document.write().
  window.setTimeout(waitForFontsAndPrint, 1500);
};
