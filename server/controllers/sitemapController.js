const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const { openListingQuery } = require("../utils/listingExpiry");
const { isCompanyActive } = require("../utils/employerOwnership");

// G02: sitemap of the public pages on the website (docs/launch/domain-e2job.md). Served by
// the API at /sitemap.xml; client/vercel.json rewrites www.e2job.com/sitemap.xml here.
const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://www.e2job.com").replace(/\/+$/, "");
const MAX_PER_TYPE = 10000; // a sitemap file may hold 50,000 URLs
const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/jobs", changefreq: "hourly", priority: "0.9" },
  { path: "/internships", changefreq: "hourly", priority: "0.9" },
  { path: "/privacy", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/contact", changefreq: "monthly", priority: "0.3" },
];

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

const urlEntry = ({ path, lastmod, changefreq, priority }) =>
  [
    "  <url>",
    `    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n");

// Published, not past the deadline, and posted on our site (external listings have no page).
const openOwnListings = (Model) =>
  Model.find(openListingQuery({ isExternal: { $ne: true } }))
    .select("_id updatedAt")
    .sort({ updatedAt: -1 })
    .limit(MAX_PER_TYPE)
    .lean();

// Same rule as GET /api/companies/:id: published, admin-approved, and the company (if any) active.
const publicCompanyProfiles = async () => {
  const profiles = await EmployerProfile.find({ isPublished: true, verificationStatus: "approved" })
    .select("_id updatedAt userId")
    .populate("userId", "companyId")
    .sort({ updatedAt: -1 })
    .limit(MAX_PER_TYPE)
    .lean();
  const companyIds = [...new Set(profiles.map((p) => p.userId?.companyId).filter(Boolean).map(String))];
  const companies = companyIds.length
    ? await Company.find({ _id: { $in: companyIds } }).select("_id status").lean()
    : [];
  const active = new Set(companies.filter(isCompanyActive).map((c) => String(c._id)));
  return profiles.filter((p) => !p.userId?.companyId || active.has(String(p.userId.companyId)));
};

// GET /sitemap.xml
exports.getSitemap = async (req, res, next) => {
  try {
    const [jobs, internships, companies] = await Promise.all([
      openOwnListings(Job),
      openOwnListings(Internship),
      publicCompanyProfiles(),
    ]);

    const entries = [
      ...STATIC_PAGES.map(urlEntry),
      ...jobs.map((j) => urlEntry({ path: `/jobs/${j._id}`, lastmod: j.updatedAt, changefreq: "daily", priority: "0.8" })),
      ...internships.map((i) => urlEntry({ path: `/internships/${i._id}`, lastmod: i.updatedAt, changefreq: "daily", priority: "0.8" })),
      ...companies.map((c) => urlEntry({ path: `/companies/${c._id}`, lastmod: c.updatedAt, changefreq: "weekly", priority: "0.5" })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      "</urlset>",
      "",
    ].join("\n");

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    return res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
};
