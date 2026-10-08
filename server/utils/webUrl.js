// Links parsed from resumes or typed into profiles (GitHub, LinkedIn, live demo). A parser
// sometimes returns the label ("GitHub") instead of the address; saved as-is it becomes a
// relative link that opens our own 404 page (QA bugs 2 and 3).

const DOMAIN_LIKE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

/** "github.com/x" -> "https://github.com/x"; anything that isn't a web address -> "". */
const webUrlOrEmpty = (value) => {
  const text = String(value || "").trim();
  if (!text || /\s/.test(text) || !DOMAIN_LIKE.test(text)) return "";
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

module.exports = { webUrlOrEmpty };
