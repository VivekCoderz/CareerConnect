// Rejects request bodies where a known text field is not text (e.g. adminNote: 5 or
// title: ["a"]). Handlers call .trim() on these fields, so non-strings used to give a
// 500 (ADM-22/23, BUG-16, BUG-19). Also requires meeting links to be http(s) URLs, so a
// "javascript:" link can't be saved and shown to candidates (BUG-08).

const TEXT_FIELDS = [
  "title", "adminNote", "rejectionReason", "remarks", "reason", "dismissalReason",
  "cancellationReason", "cancellationMessage", "meetingLink", "note", "notes",
];

const isHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const requireTextFields = (req, res, next) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return next();
  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return res.status(400).json({ success: false, field, message: `${field} must be text` });
    }
  }
  if (body.meetingLink && body.meetingLink.trim() && !isHttpUrl(body.meetingLink.trim())) {
    return res.status(400).json({
      success: false,
      field: "meetingLink",
      message: "Meeting link must be a full web address starting with https://",
    });
  }
  return next();
};

module.exports = { requireTextFields, isHttpUrl };
