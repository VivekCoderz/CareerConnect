// Emails (and, for employers, in-app notifications) for account events. Application status
// updates are handled by services/applicationNotifications.js (in-app + good news now,
// rejections in the daily summary). Every notify* function is fire and forget: handlers
// call it without awaiting, and failures are logged, never thrown. Only fields the recipient may see are used — never interviewer feedback,
// scores, scorecards, notes or internal comments.

const User = require("../models/User");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const { createNotification, DASHBOARDS, dashboardPath } = require("./notificationService");
const { queueEmail, track } = require("./notificationEmail");

const idOf = (value) => value?._id || value || null;

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
  if (!text || !interview) return;

  // 1. Resolve Application if not passed
  let appRecord = application;
  if (!appRecord && interview.applicationId) {
    appRecord = await Application.findById(idOf(interview.applicationId))
      .select("studentEmail studentName opportunityTitle companyName candidateId")
      .lean()
      .catch(() => null);
  }

  // 2. Resolve Candidate user
  const candidateUserId = idOf(interview.candidateId) || idOf(appRecord?.candidateId);
  const candidate = candidateUserId ? await loadUser(candidateUserId).catch(() => null) : null;

  // 3. Fallback for recipient email and name
  const recipientEmail = candidate?.email || appRecord?.studentEmail || interview?.candidateEmail;
  if (!recipientEmail) {
    console.warn(`[notifications] No recipient email found for interview ${interview._id || "unknown"}`);
    return;
  }

  const recipientName = candidate?.fullName || appRecord?.studentName || interview?.candidateName || "Candidate";

  const { title, company } = await listingInfo({
    jobId: interview.jobId,
    internshipId: interview.internshipId,
    opportunityTitle: appRecord?.opportunityTitle,
    companyName: appRecord?.companyName,
  });

  const when = [interview.scheduledDate, interview.scheduledTime || interview.startTime].filter(Boolean).join(" at ");
  const lines = [`${interview.roundName || "Interview"} for ${title}${company ? ` at ${company}` : ""}.`];
  if (type !== "cancelled") {
    if (when) lines.push(`When: ${when}`);
    if (interview.interviewType || interview.mode || interview.meetingMode) {
      lines.push(`Mode: ${interview.interviewType || interview.mode || interview.meetingMode}`);
    }
  }
  const meetingLink = type !== "cancelled" && /^https?:\/\//i.test(interview.meetingLink || "") ? interview.meetingLink : null;
  queueEmail({
    to: recipientEmail,
    subject: `${text.subject}: ${title}`,
    heading: text.heading,
    greetingName: recipientName,
    lines,
    extraLink: meetingLink ? { url: meetingLink, text: "Join the interview" } : null,
    linkPath: `${dashboardPath(candidate)}?tab=interviews`,
    linkText: "View your interviews",
  });
});

/** Candidate: an offer was sent. Details (salary, terms) are only shown in the dashboard. */
const notifyOfferSent = fireAndForget("offer", async ({ offer, application = null }) => {
  if (!offer) return;
  let appRecord = application;
  if (!appRecord && offer.applicationId) {
    appRecord = await Application.findById(idOf(offer.applicationId))
      .select("studentEmail studentName opportunityTitle companyName candidateId")
      .lean()
      .catch(() => null);
  }
  const candidateUserId = idOf(offer.candidateId) || idOf(appRecord?.candidateId);
  const candidate = candidateUserId ? await loadUser(candidateUserId).catch(() => null) : null;
  const recipientEmail = candidate?.email || appRecord?.studentEmail;
  if (!recipientEmail) return;

  const recipientName = candidate?.fullName || appRecord?.studentName || "Candidate";

  const [job, profile] = await Promise.all([
    offer.jobId ? Job.findById(idOf(offer.jobId)).select("title companyName").lean().catch(() => null) : null,
    offer.employerId ? EmployerProfile.findById(idOf(offer.employerId)).select("companyName").lean().catch(() => null) : null,
  ]);
  const company = profile?.companyName || job?.companyName || appRecord?.companyName || "";
  const role = offer.designation || job?.title || appRecord?.opportunityTitle || "a role";
  queueEmail({
    to: recipientEmail,
    subject: `You have a job offer${company ? ` from ${company}` : ""}`,
    heading: "You have received an offer",
    greetingName: recipientName,
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

/** Employer: the candidate accepted or declined their offer (QA bug 15). In-app + email. */
const notifyOfferResponse = fireAndForget("offer response", async ({ offer, status }) => {
  const [profile, job, candidate] = await Promise.all([
    offer.employerId ? EmployerProfile.findById(idOf(offer.employerId)).select("userId").lean() : null,
    offer.jobId ? Job.findById(idOf(offer.jobId)).select("title createdBy").lean() : null,
    loadUser(offer.candidateId),
  ]);
  const employer = await loadUser(profile?.userId || job?.createdBy);
  if (!employer) return;
  const accepted = status === "Accepted";
  const role = offer.designation || job?.title || "the role";
  const who = candidate?.fullName || "The candidate";
  const title = accepted ? "Offer accepted" : "Offer declined";
  const lines = [`${who} has ${accepted ? "accepted" : "declined"} your offer for ${role}.`];

  await createNotification({
    recipientId: employer._id,
    title,
    message: lines.join(" "),
    notificationType: "OFFER",
    actionUrl: DASHBOARDS.employer,
    metadata: { offerId: String(offer._id), status },
  });
  queueEmail({
    to: employer.email,
    subject: `${title}: ${role}`,
    heading: title,
    greetingName: employer.fullName,
    lines,
    linkPath: DASHBOARDS.employer,
    linkText: "Open your employer dashboard",
  });
});

module.exports = {
  notifyInterviewEvent,
  notifyOfferSent,
  notifyOfferResponse,
  notifyEmployerVerification,
  notifyListingDecision,
};
