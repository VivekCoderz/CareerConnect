// The jobs page offers fixed categories, but employer and feed listings store free-text
// categories ("Marketing", "Software Development", "General"). Matching the exact label
// found nothing for most categories (QA bug 5), so each label also matches related words
// in the category, department, title or skills.

const CATEGORY_KEYWORDS = {
  "Software Development": ["software", "developer", "engineer", "programming", "backend", "frontend", "full stack", "full-stack"],
  "Data Science": ["data scien", "data analy", "analytics", "data engineer", "business intelligence", "power bi", "tableau"],
  "Machine Learning & AI": ["machine learning", "artificial intelligence", "\\bai\\b", "\\bml\\b", "deep learning", "nlp", "computer vision", "llm"],
  "Web Development": ["web", "frontend", "front-end", "react", "javascript", "html", "full stack", "full-stack", "mern"],
  "DevOps & Cloud": ["devops", "cloud", "aws", "azure", "gcp", "kubernetes", "docker", "sre", "site reliability"],
  "UI/UX Design": ["ui/ux", "\\bux\\b", "\\bui\\b", "product design", "designer", "figma"],
  "Digital Marketing": ["marketing", "seo", "social media", "content", "growth", "performance market", "brand"],
  "Finance & Accounting": ["finance", "financial", "accounting", "accountant", "audit", "tax", "\\bca\\b"],
  "Human Resources (HR)": ["human resource", "\\bhr\\b", "recruit", "talent acquisition", "people operations"],
  "Sales & Business Dev": ["sales", "business development", "\\bbd\\b", "account executive", "inside sales", "customer success"],
};

const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * $or clauses matching a category label. Known labels also match their keywords;
 * any other value matches as an escaped substring, as before.
 */
const categoryClauses = (category) => {
  const label = String(category || "").slice(0, 100);
  const words = CATEGORY_KEYWORDS[label];
  const regex = words ? new RegExp(words.join("|"), "i") : new RegExp(escape(label), "i");
  const clauses = [{ category: regex }, { department: regex }, { title: regex }];
  if (words) clauses.push({ requiredSkills: regex });
  return clauses;
};

module.exports = { CATEGORY_KEYWORDS, categoryClauses };
