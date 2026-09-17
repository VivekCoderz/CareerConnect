const isPdf = (buffer) => buffer?.subarray(0, 5).toString("ascii") === "%PDF-";
const isDoc = (buffer) => buffer?.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
const isDocx = (buffer) =>
  buffer?.subarray(0, 4).equals(Buffer.from("504b0304", "hex")) &&
  buffer.includes(Buffer.from("[Content_Types].xml")) &&
  buffer.includes(Buffer.from("word/document.xml"));
const isMp4 = (buffer) => buffer?.subarray(4, 8).toString("ascii") === "ftyp";
const isWebm = (buffer) => buffer?.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));

const isResumeFile = (file) => {
  const name = (file?.originalname || "").toLowerCase();
  const buffer = file?.buffer;
  if (name.endsWith(".pdf")) return isPdf(buffer);
  if (name.endsWith(".docx")) return isDocx(buffer);
  if (name.endsWith(".doc")) return isDoc(buffer);
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
