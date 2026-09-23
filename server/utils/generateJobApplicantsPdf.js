const PDFDocument = require("pdfkit");

/**
 * Extract clean string of skills from various formats
 */
const extractSkills = (skills) => {
  if (!skills) return "N/A";
  if (Array.isArray(skills)) {
    const list = skills
      .map((s) => (typeof s === "string" ? s.trim() : s?.name || ""))
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : "N/A";
  }
  if (typeof skills === "string" && skills.trim()) {
    return skills.trim();
  }
  if (typeof skills === "object") {
    const values = Object.values(skills).flatMap((v) =>
      Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n]/) : []
    );
    const cleaned = values.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(", ") : "N/A";
  }
  return "N/A";
};

/**
 * Format date in Indian English format
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
 * Get status color hex for badges
 */
const getStatusColors = (status = "") => {
  const s = String(status).toLowerCase();
  if (s.includes("select") || s.includes("hired") || s.includes("pass")) {
    return { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" }; // Emerald
  }
  if (s.includes("reject") || s.includes("fail")) {
    return { bg: "#fff1f2", text: "#9f1239", border: "#fecdd3" }; // Rose
  }
  if (s.includes("schedul") || s.includes("interview") || s.includes("progress")) {
    return { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }; // Blue
  }
  return { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" }; // Slate
};

/**
 * Generate PDF buffer for Job Applicants with Recruitment Rounds
 * @param {Object} job - The Job document or object
 * @param {Array} applications - Array of applications
 * @param {Object} options - { stageFilter, generatedBy, companyName }
 * @returns {Promise<Buffer>}
 */
const generateJobApplicantsPdf = (job = {}, applications = [], options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `${job.title || "Job"}_Applicants_Report`,
          Author: options.generatedBy || "CareerConnect",
          Subject: "Job Applicants & Recruitment Rounds Report",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // Ensure Job recruitment stages
      const stages =
        Array.isArray(job.recruitmentStages) && job.recruitmentStages.length > 0
          ? [...job.recruitmentStages].sort((a, b) => (a.order || 0) - (b.order || 0))
          : Array.isArray(job.interviewRounds) && job.interviewRounds.length > 0
          ? job.interviewRounds.map((r, i) => ({
              name: r.name || `Round ${i + 1}`,
              type: r.type || "Interview",
              order: r.order || i + 1,
              description: r.description || "",
            }))
          : [
              { name: "Resume Screening", type: "Resume Screening", order: 0 },
              { name: "Technical Interview", type: "Technical Interview", order: 1 },
              { name: "HR Interview", type: "HR Interview", order: 2 },
            ];

      // Filter applications if a specific stage filter was requested
      let filteredApps = applications;
      if (options.stageFilter && options.stageFilter !== "All") {
        const filterLower = options.stageFilter.toLowerCase();
        filteredApps = applications.filter((app) => {
          if (filterLower === "selected") {
            return (
              (app.overallStatus || "").toLowerCase() === "selected" ||
              (app.status || "").toLowerCase() === "selected"
            );
          }
          if (filterLower === "rejected") {
            return (
              (app.overallStatus || "").toLowerCase() === "rejected" ||
              (app.status || "").toLowerCase() === "rejected"
            );
          }
          const stName = (app.currentStageName || app.stage || "").toLowerCase();
          return stName === filterLower;
        });
      }

      // ==========================================
      // 1. HEADER BANNER
      // ==========================================
      const headerHeight = 70;
      doc
        .rect(margin, margin, contentWidth, headerHeight)
        .fill("#0f172a"); // Dark Slate/Navy

      // Brand Title
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#94a3b8")
        .text("CAREERCONNECT  |  ENTERPRISE RECRUITMENT REPORT", margin + 14, margin + 12);

      // Report Main Title
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#ffffff")
        .text("Applicant Roster & Selection Rounds Report", margin + 14, margin + 26);

      // Company & Job Meta
      const companyTitle =
        options.companyName || job.companyName || "CareerConnect Partner Employer";
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#cbd5e1")
        .text(`${companyTitle}  ·  Generated on ${formatDate(new Date())}`, margin + 14, margin + 48);

      // Top right badge
      doc
        .rect(margin + contentWidth - 110, margin + 18, 96, 32)
        .fillAndStroke("#1e293b", "#334155");

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#38bdf8")
        .text("TOTAL APPLICANTS", margin + contentWidth - 105, margin + 23, { width: 86, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#ffffff")
        .text(String(filteredApps.length), margin + contentWidth - 105, margin + 34, { width: 86, align: "center" });

      doc.y = margin + headerHeight + 14;

      // ==========================================
      // 2. JOB INFORMATION SUMMARY CARD
      // ==========================================
      const jobCardY = doc.y;
      const jobCardHeight = 65;

      doc
        .roundedRect(margin, jobCardY, contentWidth, jobCardHeight, 6)
        .fillAndStroke("#f8fafc", "#e2e8f0");

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#1e293b")
        .text(job.title || "Job Position", margin + 14, jobCardY + 10);

      const jobSpecsCol1 = [
        `Category: ${job.category || "General"} (${job.subCategory || "Standard"})`,
        `Department: ${job.department || "General"}`,
      ];
      const jobSpecsCol2 = [
        `Work Mode: ${job.workMode || "On-site"} · ${job.employmentType || "Full-time"}`,
        `Location: ${job.location || job.city || "India"}`,
      ];
      const salaryText =
        job.salaryRange && job.salaryRange.max > 0
          ? `Rs. ${(job.salaryRange.min / 100000).toFixed(1)}L - ${(job.salaryRange.max / 100000).toFixed(1)}L PA`
          : job.stipend || "Competitive / Not Disclosed";

      const jobSpecsCol3 = [
        `Openings: ${job.openings || 1}`,
        `Compensation: ${salaryText}`,
      ];

      doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
      doc.text(jobSpecsCol1.join("\n"), margin + 14, jobCardY + 28, { lineGap: 3 });
      doc.text(jobSpecsCol2.join("\n"), margin + 180, jobCardY + 28, { lineGap: 3 });
      doc.text(jobSpecsCol3.join("\n"), margin + 360, jobCardY + 28, { lineGap: 3 });

      doc.y = jobCardY + jobCardHeight + 12;

      // ==========================================
      // 3. SELECTION ROUNDS PIPELINE
      // ==========================================
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor("#0f172a")
        .text("Job Selection Rounds & Evaluation Pipeline", margin, doc.y);

      doc.moveDown(0.3);

      const pipelineBoxY = doc.y;
      const stageBoxWidth = Math.min(130, Math.floor((contentWidth - (stages.length - 1) * 8) / stages.length));

      stages.forEach((st, idx) => {
        const boxX = margin + idx * (stageBoxWidth + 8);
        doc
          .roundedRect(boxX, pipelineBoxY, stageBoxWidth, 42, 4)
          .fillAndStroke("#ffffff", "#cbd5e1");

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#6366f1")
          .text(`ROUND ${idx + 1}`, boxX + 6, pipelineBoxY + 6);

        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor("#1e293b")
          .text(st.name || `Round ${idx + 1}`, boxX + 6, pipelineBoxY + 16, {
            width: stageBoxWidth - 12,
            height: 12,
            ellipsis: true,
          });

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#64748b")
          .text(st.type || "Interview", boxX + 6, pipelineBoxY + 29, {
            width: stageBoxWidth - 12,
            ellipsis: true,
          });
      });

      doc.y = pipelineBoxY + 52;

      // Line separator
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .moveTo(margin, doc.y)
        .lineTo(margin + contentWidth, doc.y)
        .stroke();

      doc.moveDown(0.6);

      // ==========================================
      // 4. APPLICANTS LIST WITH ROUND DETAILS
      // ==========================================
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0f172a")
        .text(`Applicant Records & Rounds Progress (${filteredApps.length})`, margin, doc.y);

      doc.moveDown(0.4);

      if (filteredApps.length === 0) {
        doc
          .roundedRect(margin, doc.y, contentWidth, 50, 4)
          .fillAndStroke("#f8fafc", "#e2e8f0");

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#64748b")
          .text(
            "No applicant records found matching the specified recruitment criteria.",
            margin,
            doc.y + 18,
            { align: "center", width: contentWidth }
          );
        doc.y += 60;
      }

      // Render each applicant
      filteredApps.forEach((app, index) => {
        const cand = app.candidateId || {};
        const appData = app.applicationData || {};

        const name = app.studentName || appData.fullName || cand.fullName || `Candidate #${index + 1}`;
        const email = app.studentEmail || appData.email || cand.email || "N/A";
        const phone = app.studentPhone || appData.phone || cand.phone || "N/A";
        const college = appData.college || cand.college || "N/A";
        const degree = app.education || appData.degree || appData.education || "Graduate";
        const gradYear = appData.graduationYear ? `Class of ${appData.graduationYear}` : "";
        const skills = extractSkills(app.skills || appData.skills || cand.skills);
        const experience = app.experience || appData.experience || "Fresher";
        const appliedDate = formatDate(app.appliedAt || app.createdAt);

        const currentStage = app.currentStageName || app.stage || "Resume Screening";
        const status = app.overallStatus || app.status || "Applied";
        const statusColors = getStatusColors(status);

        // Pre-calculate needed height for this applicant card
        // Card header + contact line + skills line + round table
        const stageHistoryList = Array.isArray(app.stageHistory) && app.stageHistory.length > 0
          ? app.stageHistory
          : stages.map((st, i) => ({
              stageName: st.name,
              stageType: st.type,
              status: i === 0 ? "In Progress" : "Pending",
              remarks: "",
            }));

        const roundRowCount = stageHistoryList.length;
        const estimatedHeight = 70 + (roundRowCount + 1) * 16 + 18;

        // Check if we need a new page before drawing this applicant card
        if (doc.y + estimatedHeight > pageHeight - margin - 40) {
          doc.addPage();
          doc.y = margin + 10;
        }

        const cardStartY = doc.y;

        // Candidate Card Background Outline
        doc
          .roundedRect(margin, cardStartY, contentWidth, estimatedHeight, 6)
          .fillAndStroke("#ffffff", "#e2e8f0");

        // Header strip for applicant
        doc
          .roundedRect(margin, cardStartY, contentWidth, 24, 6)
          .fill("#f8fafc");

        // Applicant Index & Name
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#0f172a")
          .text(`${index + 1}.  ${name}`, margin + 10, cardStartY + 7);

        // Current Stage Badge
        const stageBadgeWidth = 140;
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#4338ca")
          .text(`Current: ${currentStage}`, margin + contentWidth - 230, cardStartY + 8, {
            width: stageBadgeWidth,
            align: "right",
          });

        // Overall Status Badge
        const statusBadgeWidth = 70;
        const statusBadgeX = margin + contentWidth - statusBadgeWidth - 10;
        doc
          .roundedRect(statusBadgeX, cardStartY + 4, statusBadgeWidth, 16, 3)
          .fillAndStroke(statusColors.bg, statusColors.border);

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(statusColors.text)
          .text(status.toUpperCase(), statusBadgeX, cardStartY + 8, {
            width: statusBadgeWidth,
            align: "center",
          });

        // Contact & Education row
        let currY = cardStartY + 29;
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#334155")
          .text(
            `Email: ${email}    |    Phone: ${phone}    |    Applied: ${appliedDate}`,
            margin + 10,
            currY
          );

        currY += 13;
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#475569")
          .text(
            `College: ${college}  ·  Degree: ${degree} ${gradYear ? `(${gradYear})` : ""}  ·  Exp: ${experience}`,
            margin + 10,
            currY
          );

        currY += 13;
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#64748b")
          .text(`Key Skills: ${skills}`, margin + 10, currY, {
            width: contentWidth - 20,
            height: 10,
            ellipsis: true,
          });

        currY += 14;

        // Mini Table of Rounds
        const tableHeaderY = currY;
        doc
          .rect(margin + 8, tableHeaderY, contentWidth - 16, 14)
          .fill("#f1f5f9");

        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#475569");

        doc.text("RECRUITMENT ROUND", margin + 14, tableHeaderY + 3.5, { width: 140 });
        doc.text("ROUND TYPE", margin + 160, tableHeaderY + 3.5, { width: 90 });
        doc.text("ROUND STATUS", margin + 255, tableHeaderY + 3.5, { width: 80 });
        doc.text("SCHEDULE / REMARKS", margin + 340, tableHeaderY + 3.5, { width: 170 });

        currY = tableHeaderY + 14;

        stageHistoryList.forEach((round, rIdx) => {
          const rName = round.stageName || round.name || `Round ${rIdx + 1}`;
          const rType = round.stageType || round.type || "Evaluation";
          const rStatus = round.status || "Pending";
          const rColors = getStatusColors(rStatus);

          let rDetails = "";
          if (round.scheduledDate || round.scheduledTime) {
            rDetails = `Date: ${round.scheduledDate || ""} ${round.scheduledTime || ""}`.trim();
          } else if (round.remarks || round.feedback) {
            rDetails = round.remarks || round.feedback;
          } else if (round.score !== undefined && round.score > 0) {
            rDetails = `Score: ${round.score}/100`;
          } else {
            rDetails = rStatus === "Passed" ? "Cleared round" : rStatus === "In Progress" ? "In progress" : "Awaiting stage";
          }

          // Alternating row background
          if (rIdx % 2 === 1) {
            doc.rect(margin + 8, currY, contentWidth - 16, 14).fill("#fafafa");
          }

          doc
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#1e293b")
            .text(rName, margin + 14, currY + 3, { width: 140, ellipsis: true });

          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#64748b")
            .text(rType, margin + 160, currY + 3, { width: 90, ellipsis: true });

          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor(rColors.text)
            .text(rStatus, margin + 255, currY + 3, { width: 80, ellipsis: true });

          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#475569")
            .text(rDetails, margin + 340, currY + 3, { width: contentWidth - 355, ellipsis: true });

          currY += 14;
        });

        doc.y = cardStartY + estimatedHeight + 10;
      });

      // ==========================================
      // 5. FOOTER (Multi-page safe with bufferPages)
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Thin footer divider
        doc
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .moveTo(margin, pageHeight - margin + 4)
          .lineTo(margin + contentWidth, pageHeight - margin + 4)
          .stroke();

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#94a3b8")
          .text(
            "CareerConnect Enterprise  ·  Confidential Candidate Recruitment Document  ·  Internal Evaluation Only",
            margin,
            pageHeight - margin + 8,
            { align: "left" }
          );

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#64748b")
          .text(
            `Page ${i + 1} of ${range.count}`,
            margin,
            pageHeight - margin + 8,
            { align: "right", width: contentWidth }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateJobApplicantsPdf,
};
