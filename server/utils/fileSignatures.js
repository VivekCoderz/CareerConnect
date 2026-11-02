const isPdf = (buffer) => buffer?.subarray(0, 5).toString("ascii") === "%PDF-";
const isMp4 = (buffer) => buffer?.subarray(4, 8).toString("ascii") === "ftyp";
const isWebm = (buffer) => buffer?.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));

// Resumes are PDF only (G10): the content must really be a PDF, whatever the name says.
const isResumeFile = (file) => {
  const name = (file?.originalname || "").toLowerCase();
  const buffer = file?.buffer;
  if (name.endsWith(".pdf")) return isPdf(buffer);
  return false;
};

const isCourseFile = (type, name, header) => {
  const normalized = (name || "").toLowerCase();
  if (type === "pdf") return normalized.endsWith(".pdf") && isPdf(header);
  if (type === "video") {
    return ((normalized.endsWith(".mp4") || normalized.endsWith(".m4v") || normalized.endsWith(".mov")) && isMp4(header)) ||
      (normalized.endsWith(".webm") && isWebm(header));
  }
  return false;
};

module.exports = { isResumeFile, isCourseFile };
