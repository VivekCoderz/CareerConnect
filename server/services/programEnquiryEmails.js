// C11: emails sent for every new programme enquiry (C10). Both go through queueEmail, so they
// run in the background, never fail the enquiry, and share the daily non-OTP email budget.
// The enquiry itself is always stored, so an email that is skipped or fails loses nothing:
// the admin page still lists it.
const { queueEmail } = require("./notificationEmail");

// Where new enquiries are sent. Set PROGRAM_ENQUIRY_ADMIN_EMAIL on Render; until then they go
// to the support group so no lead is missed.
const DEFAULT_ADMIN_EMAIL = "support@e2job.com";
const adminEmail = () => (process.env.PROGRAM_ENQUIRY_ADMIN_EMAIL || "").trim() || DEFAULT_ADMIN_EMAIL;

const ADMIN_PAGE = "/admin/program-enquiries";

const YEAR_LABELS = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year", 5: "5th year", graduated: "Graduated" };
const yearLabel = (value) => YEAR_LABELS[value] || value;
const levelLabel = (value) => (value ? value[0].toUpperCase() + value.slice(1) : "");

/** Summary for the team, with a link to the enquiry on the admin page. */
const notifyAdmin = (enquiry) =>
  queueEmail({
    to: adminEmail(),
    subject: `New programme enquiry: ${enquiry.programTitle} (${enquiry.reference})`,
    heading: "New programme enquiry",
    lines: [
      `Programme: ${enquiry.programTitle}`,
      `Reference: ${enquiry.reference}`,
      `Name: ${enquiry.name}`,
      `Email: ${enquiry.email}`,
      `Mobile: ${enquiry.countryCode} ${enquiry.phone}`,
      `College: ${enquiry.college}`,
      `Degree: ${enquiry.degree} (${yearLabel(enquiry.yearOfStudy)})`,
      `City: ${enquiry.city}`,
      `Preferred level: ${levelLabel(enquiry.level)}`,
      `Message: ${enquiry.message || "(none)"}`,
      `Sent ${enquiry.user ? "while logged in" : "without logging in"}.`,
    ],
    linkPath: `${ADMIN_PAGE}?ref=${encodeURIComponent(enquiry.reference)}`,
    linkText: "Open programme enquiries",
  });

/** Confirmation for the student: no trainer, timings or fees in writing; the team calls. */
const confirmToStudent = (enquiry) =>
  queueEmail({
    to: enquiry.email,
    subject: `We've got your enquiry for ${enquiry.programTitle}`,
    heading: "Thank you for your enquiry",
    greetingName: enquiry.name,
    lines: [
      `We've received your enquiry for ${enquiry.programTitle}. Your reference number is ${enquiry.reference}.`,
      "Our team will contact you soon with the trainer, timings and fees, and answer any questions you have.",
      "If you didn't send this enquiry, you can ignore this email.",
    ],
    linkPath: `/programs/${encodeURIComponent(enquiry.programSlug)}`,
    linkText: "View the programme",
  });

/** Fire and forget: request handlers must not await this. */
const sendNewEnquiryEmails = (enquiry) => Promise.all([notifyAdmin(enquiry), confirmToStudent(enquiry)]);

module.exports = { sendNewEnquiryEmails, adminEmail, ADMIN_PAGE, DEFAULT_ADMIN_EMAIL };
