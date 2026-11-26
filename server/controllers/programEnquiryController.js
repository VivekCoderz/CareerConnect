// C10: POST /api/programs/:slug/enquiry. Works with or without login; a logged-in student's
// blank fields are filled from their account. Stores a ProgramEnquiry (status New) and
// returns its reference number.
const crypto = require("crypto");
const ProgramEnquiry = require("../models/ProgramEnquiry");
const { PROGRAM_LEVELS, YEARS_OF_STUDY, OPEN_ENQUIRY_STATUSES } = ProgramEnquiry;
const { findProgram } = require("../services/programCatalog");
const { readConsent } = require("../utils/consent");
const { validatePhoneFormat } = require("../middleware/validationMiddleware");
const { validateEmail } = require("../services/emailValidationService");

const ENQUIRY_CONSENT_REQUIRED = {
  success: false,
  code: "CONSENT_REQUIRED",
  field: "acceptedTerms",
  message: "Please agree to the Terms and Privacy Policy so our team can contact you.",
};

const DUPLICATE_ENQUIRY = {
  success: false,
  code: "ENQUIRY_EXISTS",
  field: "email",
  message: "You already have an open enquiry for this programme. Our team will call you soon.",
};

// No 0/O or 1/I, so a reference read out on a call is not misheard.
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newReference = () =>
  `ENQ-${Array.from(crypto.randomBytes(8), (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join("")}`;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const invalid = (res, field, message) => res.status(400).json({ success: false, field, message });

/** 404 before reCAPTCHA and validation, so an unknown programme costs nothing. */
const loadProgram = (req, res, next) => {
  const program = findProgram(req.params.slug);
  if (!program) return res.status(404).json({ success: false, message: "Programme not found" });
  req.program = program;
  return next();
};

/** Blank fields come from the logged-in account; anything the student typed wins. */
const withAccountDefaults = (body, user) => {
  const fields = {
    name: text(body.name),
    email: text(body.email),
    countryCode: text(body.countryCode),
    phone: typeof body.phone === "number" ? String(body.phone) : text(body.phone),
    college: text(body.college),
    degree: text(body.degree),
    city: text(body.city),
  };
  if (!user) return fields;
  // The account's phone comes with the account's country code.
  if (!fields.phone && text(user.phone)) {
    fields.phone = text(user.phone);
    fields.countryCode = text(user.countryCode);
  }
  const fromAccount = { name: user.fullName, email: user.email, college: user.college, degree: user.course, city: user.city };
  for (const [field, value] of Object.entries(fromAccount)) {
    if (!fields[field]) fields[field] = text(value);
  }
  return fields;
};

const createProgramEnquiry = async (req, res, next) => {
  try {
    const body = req.body || {};
    const fields = withAccountDefaults(body, req.user);
    const countryCode = fields.countryCode || "+91";
    const phone = fields.phone.replace(/\D/g, "");
    const yearOfStudy = text(body.yearOfStudy).toLowerCase();
    const level = text(body.level).toLowerCase();
    const message = body.message === undefined || body.message === null ? "" : body.message;

    if (fields.name.length < 2 || fields.name.length > 50) return invalid(res, "name", "Enter your name (2 to 50 characters).");

    const emailCheck = await validateEmail(fields.email, { checkDns: false, checkExternal: false });
    if (!emailCheck.isValid) {
      return invalid(res, "email", emailCheck.isDisposable
        ? "Temporary or disposable email addresses are not allowed. Please use your own email."
        : "Enter a valid email.");
    }
    if (!/^\+\d{1,4}$/.test(countryCode)) return invalid(res, "countryCode", "Enter a valid country code.");
    if (!validatePhoneFormat(phone, countryCode)) {
      return invalid(res, "phone", countryCode === "+91"
        ? "Enter a valid 10-digit mobile number."
        : "Enter a valid mobile number (6 to 15 digits).");
    }
    if (!fields.college || fields.college.length > 150) return invalid(res, "college", "Enter your college (up to 150 characters).");
    if (!fields.degree || fields.degree.length > 100) return invalid(res, "degree", "Enter your degree (up to 100 characters).");
    if (!YEARS_OF_STUDY.includes(yearOfStudy)) return invalid(res, "yearOfStudy", "Choose your year of study.");
    if (!fields.city || fields.city.length > 100) return invalid(res, "city", "Enter your city (up to 100 characters).");
    if (!PROGRAM_LEVELS.includes(level)) return invalid(res, "level", "Choose a level.");
    if (typeof message !== "string" || message.trim().length > 500) {
      return invalid(res, "message", "Keep the message under 500 characters.");
    }

    const consent = readConsent(body);
    if (!consent) return res.status(400).json(ENQUIRY_CONSENT_REQUIRED);

    const email = emailCheck.normalizedEmail;
    const program = req.program;
    const open = await ProgramEnquiry.exists({
      email,
      programSlug: program.slug,
      status: { $in: OPEN_ENQUIRY_STATUSES },
    });
    if (open) return res.status(409).json(DUPLICATE_ENQUIRY);

    const enquiry = {
      programSlug: program.slug,
      programTitle: program.title,
      name: fields.name,
      email,
      countryCode,
      phone,
      college: fields.college,
      degree: fields.degree,
      yearOfStudy,
      city: fields.city,
      level,
      message: message.trim(),
      consent,
      user: req.user?._id || null,
      status: "New",
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const saved = await ProgramEnquiry.create({ ...enquiry, reference: newReference() });
        return res.status(201).json({
          success: true,
          reference: saved.reference,
          message: `Thank you. Our team will call you about ${program.title}.`,
        });
      } catch (err) {
        if (err?.code !== 11000) throw err;
        // The same email sent two enquiries at once: the index let only one in.
        if (err.keyPattern?.email) return res.status(409).json(DUPLICATE_ENQUIRY);
        // Otherwise the random reference was taken; try a new one.
      }
    }
    throw new Error("Could not create a unique enquiry reference");
  } catch (err) {
    return next(err);
  }
};

module.exports = { loadProgram, createProgramEnquiry };
