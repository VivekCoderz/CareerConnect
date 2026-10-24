// Every job or internship application must carry a resume (JP-01). A resume is either
// a file uploaded to E2Job storage or an external link the candidate pasted (Google
// Drive, Dropbox…).
//
// Uploaded files live in private Cloudinary storage and each one has a ResumeAsset
// record naming its owner (config/cloudinary.js). The record is deleted together with
// the file (services/resumeAssetCleanup.js), so a Cloudinary URL is only accepted when
// a ResumeAsset owned by the applicant exists for it. That proves the file exists and
// stops a candidate from applying with someone else's resume. External links can't be
// verified, so they only have to be well-formed https URLs.

const ResumeAsset = require("../models/ResumeAsset");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");

const MAX_RESUME_URL_LENGTH = 2048;

const resumeRequiredMessage = (kind = "job") =>
  `Please upload your resume before applying for this ${kind}.`;
const RESUME_INVALID =
  "The selected resume could not be verified. Please upload your resume and try again.";

const PROFILE_MODELS = {
  student: StudentProfile,
  fresher: FresherProfile,
  professional: ProfessionalProfile,
};

// The candidate's saved resume: the upload handler writes it to the User, and profile
// edits may only have written it to the role profile.
const savedResumeUrl = async (user) => {
  if (typeof user.resumeUrl === "string" && user.resumeUrl.trim()) return user.resumeUrl.trim();
  const Profile = PROFILE_MODELS[user.userType];
  if (!Profile) return "";
  const profile = await Profile.findOne({ userId: user._id }).select("resume.resumeUrl").lean();
  const url = profile?.resume?.resumeUrl;
  return typeof url === "string" ? url.trim() : "";
};

const isUsableResume = async (url, userId) => {
  if (url.length > MAX_RESUME_URL_LENGTH) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "res.cloudinary.com") {
    return Boolean(await ResumeAsset.exists({ url, user: userId }));
  }
  return true;
};

/**
 * Picks the resume for an application: the one the candidate submitted, else their
 * saved resume. Returns { resumeUrl } or { message } explaining why they can't apply.
 * @param {object} user - authenticated candidate (req.user)
 * @param {unknown} submittedUrl - req.body.resumeUrl
 * @param {"job"|"internship"} kind - wording for the missing-resume message
 */
const resolveApplicationResume = async (user, submittedUrl, kind = "job") => {
  if (submittedUrl != null && typeof submittedUrl !== "string") return { message: RESUME_INVALID };

  const submitted = (submittedUrl || "").trim();
  if (submitted) {
    return (await isUsableResume(submitted, user._id)) ? { resumeUrl: submitted } : { message: RESUME_INVALID };
  }

  // A saved resume whose file is gone counts as no resume.
  const saved = await savedResumeUrl(user);
  if (saved && (await isUsableResume(saved, user._id))) return { resumeUrl: saved };
  return { message: resumeRequiredMessage(kind) };
};

module.exports = { resolveApplicationResume, resumeRequiredMessage, RESUME_INVALID };
