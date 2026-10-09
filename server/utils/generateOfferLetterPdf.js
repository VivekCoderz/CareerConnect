const PDFDocument = require("pdfkit");

/**
 * Formats a Date object or ISO string nicely
 */
const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
};

/**
 * Generate PDF buffer for an Offer Letter
 * @param {Object} offer - The JobOffer document or object
 * @param {Object} candidate - Candidate User object or populated candidateId
 * @param {Object} employer - EmployerProfile or company info
 * @param {Object} job - Job document
 * @returns {Promise<Buffer>}
 */
const generateOfferLetterPdf = (offer = {}, candidate = {}, employer = {}, job = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Offer Letter - ${candidate?.fullName || "Candidate"}`,
          Author: employer?.companyName || "CareerConnect Partner",
          Subject: `Employment Offer for ${offer.designation || job?.title || "Role"}`,
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const companyName = employer?.companyName || job?.companyName || "Company Partner";
      const candName = candidate?.fullName || offer.candidateName || "Candidate";
      const candEmail = candidate?.email || offer.candidateEmail || "";
      const designation = offer.designation || job?.title || "Specialist";
      const department = offer.department || job?.department || "General";
      const employmentType = offer.employmentType || job?.employmentType || "Full-time";
      const salary = offer.salary ? Number(offer.salary).toLocaleString("en-IN") : "Competitive";
      const salaryPeriod = offer.salaryPeriod || "Per Annum (LPA)";
      const currency = offer.currency || "INR (₹)";
      const joiningDate = formatDate(offer.joiningDate);
      const expiryDate = formatDate(offer.expiryDate);
      const location = offer.location || job?.location || "India";
      const offerDate = formatDate(offer.createdAt || new Date());

      // ==========================================
      // HEADER & LETTERHEAD
      // ==========================================
      doc.rect(50, 50, 495, 60).fill("#1e3a8a");
      doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text(companyName.toUpperCase(), 70, 65);
      doc.fontSize(10).font("Helvetica").fillColor("#93c5fd").text("OFFICIAL OFFER OF EMPLOYMENT", 70, 90);

      doc.fillColor("#334155").fontSize(9).font("Helvetica");
      doc.text(`Date of Issue: ${offerDate}`, 380, 70, { align: "right" });
      doc.text(`Ref: OFF-${String(offer._id || Date.now()).slice(-8).toUpperCase()}`, 380, 85, { align: "right" });

      doc.moveDown(4);

      // ==========================================
      // RECIPIENT DETAILS
      // ==========================================
      const startY = 130;
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("To:", 50, startY);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e3a8a").text(candName, 50, startY + 16);
      doc.fontSize(10).font("Helvetica").fillColor("#475569").text(`Email: ${candEmail}`, 50, startY + 32);
      if (candidate?.phone) {
        doc.text(`Phone: ${candidate.phone}`, 50, startY + 46);
      }

      // ==========================================
      // SALUTATION & OPENING
      // ==========================================
      doc.moveDown(2);
      doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text(`Dear ${candName},`, 50, startY + 75);
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10).fillColor("#334155").text(
        `We are thrilled to formally extend this offer of employment for the position of ${designation} at ${companyName}. Based on your technical background, skills, and overall interview performance, we are confident you will make a substantial contribution to our organization.`,
        50,
        doc.y,
        { lineGap: 4, width: 495 }
      );

      doc.moveDown(1.5);

      // ==========================================
      // OFFER SUMMARY TABLE
      // ==========================================
      const tableTop = doc.y;
      doc.rect(50, tableTop, 495, 24).fill("#f1f5f9");
      doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(10).text("Position & Compensation Terms", 60, tableTop + 7);

      const items = [
        ["Job Designation / Title", designation],
        ["Department", department],
        ["Employment Type", employmentType],
        ["Work Location", location],
        ["Total Compensation", `${currency} ${salary} (${salaryPeriod})`],
        ["Expected Joining Date", joiningDate],
        ["Offer Acceptance Deadline", expiryDate],
      ];

      let rowY = tableTop + 24;
      items.forEach(([label, value], idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(50, rowY, 495, 22).fill(bg);
        doc.fillColor("#475569").font("Helvetica").fontSize(9).text(label, 65, rowY + 6);
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text(String(value), 250, rowY + 6);
        rowY += 22;
      });

      doc.y = rowY + 15;

      // ==========================================
      // BENEFITS & ADDITIONAL TERMS
      // ==========================================
      if (offer.benefits && offer.benefits.length > 0) {
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Perks & Benefits Included:", 50, doc.y);
        doc.moveDown(0.3);
        const benefitsList = Array.isArray(offer.benefits) ? offer.benefits : String(offer.benefits).split(",");
        benefitsList.forEach((b) => {
          if (b && b.trim()) {
            doc.fillColor("#334155").font("Helvetica").fontSize(9).text(`•  ${b.trim()}`, 65, doc.y, { lineGap: 2 });
          }
        });
        doc.moveDown(1);
      }

      if (offer.additionalTerms && offer.additionalTerms.trim()) {
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Additional Terms & Conditions:", 50, doc.y);
        doc.moveDown(0.3);
        doc.fillColor("#475569").font("Helvetica").fontSize(8.5).text(offer.additionalTerms.trim(), 50, doc.y, {
          lineGap: 3,
          width: 495,
        });
        doc.moveDown(1);
      }

      // ==========================================
      // ACCEPTANCE & SIGNATURE BLOCK
      // ==========================================
      const footerY = Math.max(doc.y + 20, 680);
      doc.rect(50, footerY - 5, 495, 1).fill("#cbd5e1");

      doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold").text(`For ${companyName}:`, 60, footerY + 10);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("Authorized HR & Hiring Authority", 60, footerY + 25);
      doc.text("Digitally Issued via E2Job CareerConnect", 60, footerY + 38);

      doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold").text("Candidate Acceptance:", 330, footerY + 10);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`Status: ${offer.status || "Sent"}`, 330, footerY + 25);
      if (offer.respondedAt) {
        doc.text(`Responded on: ${formatDate(offer.respondedAt)}`, 330, footerY + 38);
      } else {
        doc.text(`Sign & accept by: ${expiryDate}`, 330, footerY + 38);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateOfferLetterPdf,
};
