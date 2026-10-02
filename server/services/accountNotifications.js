// Emails (and, for employers, in-app notifications) for account events. Every notify*
// function is fire and forget: handlers call it without awaiting, and failures are logged,
// never thrown. Only fields the recipient may see are used — never interviewer feedback,
// scores, scorecards, notes or internal comments.

const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const { createNotification } = require("./notificationService");
const { queueEmail, track } = require("./notificationEmail");

const DASHBOARDS = {
  student: "/student/dashboard",
  fresher: "/fresher/dashboard",
  professional: "/professional/dashboard",
  employer: "/employer/dashboard",
};
const dashboardPath = (user) =>
  DASHBOARDS[user?.userType] || (user?.role === "employer" ? DASHBOARDS.employer : DASHBOARDS.student);

const idOf = (value) => value?._id || value || null;
const normalizeStatus = (status) => String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

// Statuses another event already emails about (interview, offer) or the candidate set themselves.
const QUIET_STATUSES = new Set(["withdrawn", "interview_scheduled", "offer", "offered"]);

const STATUS_LABELS = {
  applied: "Applied",
  approved: "Approved",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview: "Interview stage",
  interview_completed: "Interview completed",
  in_progress: "In progress",
  selected: "Selected",
  hired: "Hired",
  rejected: "Not selected",
};

const loadUser = (id) => (id ? User.findById(idOf(id)).select("email fullName userType role").lean() : null);

const fireAndForget = (name, fn) => (...args) =>
  track(fn(...args).catch((err) => console.warn(`[notifications] ${name} failed:`, err.message)));

const listingInfo = async ({ jobId, internshipId, opportunityTitle, companyName }) => {
  if (opportunityTitle && companyName) return { title: opportunityTitle, company: companyName };
  const listing = (jobId && (await Job.findById(idOf(jobId)).select("title companyName employerId").lean())) ||
    (internshipId && (await Internship.findById(idOf(internshipId)).select("title companyName employerId").lean()));
  return {
    title: opportunityTitle || listing?.title || "your application",
    company: companyName || listing?.companyName || "",
  };
};

/** Candidate: their application moved to a new status. No email when nothing changed. */
const notifyApplicationStatusChange = fireAndForget("application status", async ({ application, previousStatus, newStatus }) => {
  const next = normalizeStatus(newStatus);
  if (!next || next === normalizeStatus(previousStatus) || QUIET_STATUSES.has(next)) return;
  const candidate = await loadUser(application.candidateId);
  if (!candidate?.email) return;
  const { title, company } = await listingInfo(application);
  const label = STATUS_LABELS[next] || String(newStatus);
  queueEmail({
    to: candidate.email,
    subject: `Application update: ${title}`,
    heading: "Your application status changed",
    greetingName: candidate.fullName,
    lines: [`Your application for ${title}${company ? ` at ${company}` : ""} is now: ${label}.`],
    linkPath: `${dashboardPath(candidate)}?tab=applications`,
    linkText: "View your applications",
  });
});

const INTERVIEW_TEXT = {
  scheduled: { subject: "Interview scheduled", heading: "Your interview is scheduled" },
  rescheduled: { subject: "Interview rescheduled", heading: "Your interview has a new time" },
  cancelled: { subject: "Interview cancelled", heading: "Your interview was cancelled" },
};

/**
 * Candidate: interview scheduled / rescheduled / cancelled. The meeting link goes only to
 * this interview's candidate, and never on a cancellation.
 */
const notifyInterviewEvent = fireAndForget("interview", async ({ type, interview, application = null }) => {
  const text = INTERVIEW_TEXT[type];
  if (!text) return;
  const candidate = await loadUser(interview.candidateId);
  if (!candidate?.email) return;
  const { title, company } = await listingInfo({
    jobId: interview.jobId,
    internshipId: interview.internshipId,
    opportunityTitle: application?.opportunityTitle,
    companyName: application?.companyName,
  });
  const when = [interview.scheduledDate, interview.scheduledTime || interview.startTime].filter(Boolean).join(" at ");
  const lines = [`${interview.roundName || "Interview"} for ${title}${company ? ` at ${company}` : ""}.`];
  if (type !== "cancelled") {
    if (when) lines.push(`When: ${when}`);
    if (interview.interviewType || interview.mode) lines.push(`Mode: ${interview.interviewType || interview.mode}`);
  }
  const meetingLink = type !== "cancelled" && /^https?:\/\//i.test(interview.meetingLink || "") ? interview.meetingLink : null;
  queueEmail({
    to: candidate.email,
    subject: `${text.subject}: ${title}`,
    heading: text.heading,
    greetingName: candidate.fullName,
    lines,
    extraLink: meetingLink ? { url: meetingLink, text: "Join the interview" } : null,
    linkPath: `${dashboardPath(candidate)}?tab=interviews`,
    linkText: "View your interviews",
  });
});

/** Candidate: an offer was sent. Details (salary, terms) are only shown in the dashboard. */
const notifyOfferSent = fireAndForget("offer", async ({ offer }) => {
  const candidate = await loadUser(offer.candidateId);
  if (!candidate?.email) return;
  const [job, profile] = await Promise.all([
    offer.jobId ? Job.findById(idOf(offer.jobId)).select("title companyName").lean() : null,
    offer.employerId ? EmployerProfile.findById(idOf(offer.employerId)).select("companyName").lean() : null,
  ]);
  const company = profile?.companyName || job?.companyName || "";
  const role = offer.designation || job?.title || "a role";
  queueEmail({
    to: candidate.email,
    subject: `You have a job offer${company ? ` from ${company}` : ""}`,
    heading: "You have received an offer",
    greetingName: candidate.fullName,
    lines: [`${company || "An employer"} has sent you an offer for ${role}. Review and respond in your dashboard.`],
    // Offers are accepted/declined on My Applications; no dashboard has an offers tab.
    linkPath: "/applications",
    linkText: "Review the offer",
  });
});

/**
 * Employer: a platform admin approved or rejected their company. Mentions listings that
 * were closed because of a rejection when `closedListings` counts are given.
 */
const notifyEmployerVerification = fireAndForget("employer verification", async ({
  profile, status, reason = "", closedListings = null,
}) => {
  const employer = await loadUser(profile.userId);
  if (!employer) return;
  const approved = status === "approved";
  const closedCount = (closedListings?.jobs || 0) + (closedListings?.internships || 0);
  const lines = approved
    ? ["Your company has been verified. You can now post jobs and internships."]
    : [
      "Your company could not be verified, so posting is disabled for now.",
      ...(reason ? [`Reason: ${reason}`] : []),
      ...(closedCount > 0 ? [`${closedCount} of your listing(s) were closed because of this.`] : []),
      "Reply to our support team if you think this is a mistake.",
    ];
  const title = approved ? "Your company is verified" : "Company verification not approved";

  await createNotification({
    recipientId: employer._id,
    title,
    message: lines.join(" "),
    notificationType: "COMPANY_VERIFICATION",
    actionUrl: DASHBOARDS.employer,
    metadata: { verificationStatus: status, closedListings: closedListings || undefined },
  });
  queueEmail({
    to: employer.email,
    subject: title,
    heading: title,
    greetingName: employer.fullName,
    lines,
    linkPath: DASHBOARDS.employer,
    linkText: "Open your employer dashboard",
  });
});

/** Employer: an admin approved or rejected one of their listings. Not sent for external listings. */
const notifyListingDecision = fireAndForget("listing decision", async ({ listing, decision, reason = "" }) => {
  if (listing.isExternal || !listing.createdBy) return;
  const employer = await loadUser(listing.createdBy);
  if (!employer) return;
  const approved = decision === "approved";
  const title = approved ? "Listing approved" : "Listing not approved";
  const lines = approved
    ? [`Your listing "${listing.title}" has been approved and is now live for candidates.`]
    : [`Your listing "${listing.title}" was not approved.`, ...(reason ? [`Reason: ${reason}`] : [])];

  await createNotification({
    recipientId: employer._id,
    title,
    message: lines.join(" "),
    notificationType: "LISTING_STATUS",
    actionUrl: DASHBOARDS.employer,
    metadata: { listingId: String(listing._id), decision },
  });
  queueEmail({
    to: employer.email,
    subject: `${title}: ${listing.title}`,
    heading: title,
    greetingName: employer.fullName,
    lines,
    linkPath: DASHBOARDS.employer,
    linkText: "Open your employer dashboard",
  });
});

module.exports = {
  notifyApplicationStatusChange,
  notifyInterviewEvent,
  notifyOfferSent,
  notifyEmployerVerification,
  notifyListingDecision,
};
