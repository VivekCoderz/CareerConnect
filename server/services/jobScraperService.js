const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");
const { escapeRegex } = require("../utils/listingSecurity");
const { openListingQuery } = require("../utils/listingExpiry");

// =========================================================================
// 1. CLEAN DEGREE KEYWORD MAP (SIMPLIFIED NAMES)
// =========================================================================
const COURSE_KEYWORD_MAP = {
  // Computer Applications & Engineering
  MCA: "Software Engineer OR Full Stack Developer OR Python Developer",
  BCA: "Web Developer OR Software Developer OR Programmer",
  "B.Tech": "Software Engineer OR Backend Developer OR Systems Engineer",
  "M.Tech": "Senior Software Engineer OR Cloud Architect",
  "Ph.D. Computer Science": "Computer Science Researcher OR Research Scientist",

  // Management & Commerce
  MBA: "Management Trainee OR Business Analyst OR Product Associate",
  BBA: "Business Development Executive OR Operations Trainee OR Marketing Associate",
  "B.Com": "Accountant OR Financial Analyst OR Tax Associate",
  "M.Com": "Senior Accountant OR Financial Auditor",
  "Ph.D. Management": "Management Consultant OR Strategy Researcher",

  // Law
  "LL.B": "Legal Associate OR Advocate Trainee OR Litigator",
  "B.A. LL.B": "Legal Trainee OR Corporate Law Associate",
  "BBA LL.B": "Corporate Legal Associate OR Compliance Analyst",
  "LL.M": "Corporate Lawyer OR Legal Consultant",
  "Ph.D. Law": "Legal Scholar OR Policy Researcher",

  // Pharmacy
  "B.Pharm": "QA Chemist OR QC Officer OR Pharmacist",
  "D.Pharm": "Hospital Pharmacist OR Medical Representative",
  "M.Pharm": "Formulation Scientist OR Clinical Research Associate",
  "Ph.D. Pharmacy": "Pharmaceutical Scientist OR Drug Discovery Researcher",

  // Agriculture & Forensic Science
  "B.Sc Agriculture": "Agronomist OR Agriculture Field Officer",
  "M.Sc Agriculture": "Crop Scientist OR Agronomy Researcher",
  "B.Sc Forensic Science": "Forensic Expert OR Cyber Forensic Analyst",
  "M.Sc Forensic Science":
    "Forensic Ballistics Expert OR Digital Forensic Analyst",

  // Nutrition, Hospitality & Education
  "B.Sc Nutrition & Dietetics": "Dietitian OR Clinical Nutritionist",
  "M.Sc Nutrition & Dietetics": "Sports Nutritionist OR Food Safety Consultant",
  "B.Sc Hotel Management": "Hotel Management Trainee OR Hospitality Associate",
  "M.Sc Hotel Management": "Hospitality Manager OR Operations Executive",
  "B.A.": "Policy Analyst OR Content Strategist OR Research Associate",
  "M.A.": "Policy Fellow OR Psychological Counselor",
  "B.Ed": "Teacher OR Curriculum Designer OR EdTech Trainer",
};

// =========================================================================
// 2. ADVANCED SPECIALIZATION & DOMAIN MATRIX
// =========================================================================
const SPECIALIZATION_KEYWORD_MAP = {
  // Computer Application & Engineering
  "Full Stack Web Development":
    "Full Stack Developer OR MERN Stack OR React Node Developer",
  "Artificial Intelligence & Machine Learning":
    "Machine Learning Engineer OR AI Developer OR Python AI",
  "Data Science & Business Analytics":
    "Data Scientist OR Business Analyst OR Data Analyst",
  "Cyber Security & Ethical Hacking":
    "Cyber Security Analyst OR SOC Analyst OR Penetration Tester",
  "Cloud Computing & DevOps":
    "DevOps Engineer OR Cloud Engineer OR AWS Cloud Practitioner",
  "Mobile App Development":
    "Flutter Developer OR Android Developer OR iOS Developer",
  "Software Engineering & Backend Systems":
    "Software Engineer OR Backend Developer OR Java Spring Boot",
  "AI System Design & Deep Learning":
    "AI Engineer OR Deep Learning OR Computer Vision Engineer",
  "Network Security & Cyber Defense":
    "Information Security OR Network Security Engineer OR Ethical Hacker",
  "Big Data Engineering":
    "Data Engineer OR Big Data Developer OR Spark Hadoop Engineer",
  "Quantum Computing & Algorithms":
    "Quantum Computing OR Algorithm Engineer OR Research Scientist",
  "Embedded Systems & IoT":
    "Embedded Systems Engineer OR IoT Developer OR Firmware Engineer",

  // Management & Commerce
  "Digital & Performance Marketing":
    "Digital Marketing Executive OR Performance Marketer OR SEO Specialist",
  "Finance & Investment Banking":
    "Financial Analyst OR Investment Banking Analyst OR Equity Research",
  "Human Resource Management":
    "HR Executive OR Talent Acquisition Specialist OR HR Generalist",
  "Supply Chain & Operations":
    "Supply Chain Analyst OR Operations Executive OR Logistics Coordinator",
  "Business Analytics & Strategy":
    "Business Analyst OR Strategy Consultant OR Market Research",
  "International Business & Trade":
    "Export Import Executive OR International Business Developer",
  "International Accounting & ACCA":
    "ACCA Auditor OR Financial Accountant OR Tax Associate",
  "Banking & Insurance Operations":
    "Banking Officer OR Insurance Underwriter OR Credit Analyst",
  "Corporate Taxation & Auditing":
    "Tax Consultant OR Statutory Auditor OR Internal Auditor",

  // Law
  "Corporate Law & Mergers":
    "Corporate Legal Associate OR Legal Counsel OR Compliance Officer",
  "Litigation & Criminal Defense":
    "Litigation Associate OR Advocate Trainee OR Legal Researcher",
  "Intellectual Property Rights (IPR)":
    "IPR Associate OR Patent Analyst OR Trademark Executive",
  "Cyber Law & Data Privacy":
    "Cyber Law Consultant OR Data Privacy Officer OR Compliance Analyst",

  // Pharmacy
  "Quality Assurance & Quality Control (QA/QC)":
    "Pharma QA Executive OR QC Chemist OR Quality Assurance Officer",
  "Formulation & R&D":
    "Formulation Scientist OR R&D Chemist OR Drug Formulation",
  "Pharmacovigilance & Clinical Trials":
    "Pharmacovigilance Associate OR Clinical Research Coordinator",
  "Hospital & Clinical Pharmacy":
    "Clinical Pharmacist OR Hospital Pharmacist OR Medical Dispenser",
  "Regulatory Affairs & Medical Coding":
    "Regulatory Affairs Executive OR Medical Coder",
  "Pharma Sales & Brand Management":
    "Medical Representative OR Pharma Product Specialist",

  // Agriculture & Forensic Science
  "Agronomy & Crop Management": "Agronomist OR Crop Scientist OR Farm Manager",
  "Agri-Tech & Precision Farming":
    "Agri Tech Executive OR Precision Agriculture Specialist",
  "Seed Science & Plant Breeding":
    "Seed Production Specialist OR Plant Breeder Trainee",
  "Cyber Forensics & Digital Investigation":
    "Digital Forensics Examiner OR Cyber Forensic Analyst",
  "Crime Scene Investigation & Ballistics":
    "Forensic Investigator OR Ballistics Expert Trainee",
  "Forensic Toxicology & DNA Analysis":
    "Forensic Toxicologist OR DNA Analyst Trainee",

  // Nutrition, Hospitality & Education
  "Clinical & Therapeutic Nutrition":
    "Clinical Dietitian OR Hospital Nutritionist",
  "Sports Nutrition & Wellness": "Sports Nutritionist OR Wellness Consultant",
  "Food Quality Control & Assurance":
    "Food Quality Auditor OR Food Safety Officer",
  "Front Office & Guest Relations":
    "Front Office Executive OR Guest Service Associate",
  "Food & Beverage Operations":
    "F&B Executive OR Restaurant Operations Trainee",
  "Culinary Arts & Bakery":
    "Commis Chef OR Bakery Executive OR Culinary Associate",
  "Public Policy & Political Analysis":
    "Public Policy Analyst OR Legislative Assistant OR Political Researcher",
  "Clinical & Counseling Psychology":
    "Counseling Psychologist OR Psychological Counselor",
  "Economic & Market Research": "Economic Analyst OR Market Research Analyst",
  "Pedagogy & Curriculum Design":
    "Curriculum Developer OR Instructional Designer OR Subject Matter Expert",
  "EdTech & STEM Teaching":
    "STEM Educator OR Online Tutor OR EdTech Content Creator",
};

// Comprehensive Indian Keywords List for Strict Exclusion
const INDIAN_GEO_KEYWORDS = [
  "india",
  "mumbai",
  "delhi",
  "bangalore",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
  "ahmedabad",
  "gurgaon",
  "gurugram",
  "noida",
  "jaipur",
  "lucknow",
  "chandigarh",
  "mohali",
  "faridabad",
  "panipat",
  "ghaziabad",
  "indore",
  "bhopal",
  "nagpur",
  "patna",
  "vadodara",
  "surat",
  "kanpur",
  "thane",
  "navi mumbai",
  "visakhapatnam",
  "kochi",
  "coimbatore",
  "bhubaneswar",
  "agra",
  "nashik",
  "amritsar",
  "aurangabad",
  "dehradun",
  "mysore",
  "madurai",
  "karnataka",
  "maharashtra",
  "tamil nadu",
  "telangana",
  "gujarat",
  "uttar pradesh",
  "haryana",
  "punjab",
  "rajasthan",
  "kerala",
  "madhya pradesh",
  "andhra pradesh",
  "west bengal",
  "bihar",
  "odisha",
  "jharkhand",
  "assam",
];

// ==========================================
// 3. GEETA UNIVERSITY ON-CAMPUS DRIVES
// ==========================================
const CAMPUS_DRIVES = [
 
];

const searchCache = {};
const MAX_CACHE_ENTRIES = 50;

function clearSearchCache() {
  for (const key in searchCache) {
    delete searchCache[key];
  }
}

// ==========================================
// 4. EXTERNAL LISTINGS (stored by the scheduled feed sync)
// ==========================================
// Requests never call external sites. services/externalJobSync.js fetches the approved
// feeds (Remotive, Arbeitnow) on a schedule and stores them as Job/Internship documents
// with isExternal: true; this reads them back in the shape the feed consumers expect.
// LinkedIn and Internshala scraping was removed (S07).

const DEFAULT_KEYWORDS = "Developer OR Engineer OR Analyst OR Trainee";
const EXTERNAL_LIST_LIMIT = 300;
const EXTERNAL_TYPE_LABELS = { Remotive: "Remotive Remote", Arbeitnow: "Arbeitnow Global" };
const EXTERNAL_FIELDS =
  "title companyName location workMode employmentType requiredSkills description deadline " +
  "source applyUrl attribution createdAt";

/** Approved feed sources for a `source` filter value ("all", "external", or one feed name). */
function externalSourcesFor(source = "all") {
  const { APPROVED_SOURCES } = require("./externalJobSync");
  const wanted = String(source || "all").toLowerCase();
  if (wanted === "all" || wanted === "external") return APPROVED_SOURCES;
  return APPROVED_SOURCES.filter((name) => name.toLowerCase() === wanted);
}

async function findStoredExternalOpportunities({ keywords = "", source = "all" } = {}) {
  const sources = externalSourcesFor(source);
  if (sources.length === 0 || mongoose.connection.readyState !== 1) return [];

  const filter = openListingQuery({ isExternal: true, source: { $in: sources } });
  const terms = keywords
    .split(/\s+OR\s+/i)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (terms.length > 0) {
    const keywordRegex = new RegExp(terms.map(escapeRegex).join("|"), "i");
    filter.$or = [{ title: keywordRegex }, { requiredSkills: keywordRegex }, { description: keywordRegex }];
  }

  try {
    const [jobs, internships] = await Promise.all([
      Job.find(filter).select(EXTERNAL_FIELDS).sort({ createdAt: -1 }).limit(EXTERNAL_LIST_LIMIT).lean(),
      Internship.find(filter).select(EXTERNAL_FIELDS).sort({ createdAt: -1 }).limit(EXTERNAL_LIST_LIMIT).lean(),
    ]);
    const toItem = (doc, isInternship) => {
      let opportunityType = "Full-Time Job";
      if (isInternship || /^internship$/i.test(doc.employmentType || "")) opportunityType = "Internship";
      else if (/part-time/i.test(doc.employmentType || "")) opportunityType = "Part-Time Job";
      return {
        _id: doc._id.toString(),
        id: doc._id.toString(),
        title: doc.title,
        company: doc.companyName,
        location: doc.location,
        type: EXTERNAL_TYPE_LABELS[doc.source] || doc.source,
        platformSource: doc.source,
        opportunityType,
        workMode: doc.workMode === "Remote" ? "Remote" : "On-Site / Hybrid",
        postedDate: doc.createdAt ? new Date(doc.createdAt).toISOString().split("T")[0] : "Recently",
        applyLink: doc.applyUrl,
        isExclusive: false,
        isExternal: true,
        attribution: doc.attribution,
        description: doc.description,
        skills: doc.requiredSkills || [],
        skillsRequired: doc.requiredSkills || [],
        deadline: doc.deadline,
        createdAt: doc.createdAt,
      };
    };
    return [...jobs.map((d) => toItem(d, false)), ...internships.map((d) => toItem(d, true))];
  } catch (err) {
    console.warn("Error querying stored external listings:", err.message);
    return [];
  }
}

// ==========================================
// 5. AGGREGATOR CONTROLLER ENGINE
// ==========================================
async function getAggregatedOpportunities({
  program = "all",
  specialization = "all",
  opportunityType = "all", // 'all', 'internship', 'fulltime', 'parttime'
  source = "all",
  scope = "all",
  region = "all",
  workMode = "all",
  search = "",
  q = "",
} = {}) {
  const rawQuery = search || q || "";
  const customQuery = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";

  let queryKeywords = "";
  if (customQuery) {
    queryKeywords = customQuery;
  } else if (
    specialization &&
    specialization !== "all" &&
    SPECIALIZATION_KEYWORD_MAP[specialization]
  ) {
    queryKeywords = SPECIALIZATION_KEYWORD_MAP[specialization];
  } else if (program && program !== "all" && COURSE_KEYWORD_MAP[program]) {
    queryKeywords = COURSE_KEYWORD_MAP[program];
  } else if (
    program &&
    program !== "all" &&
    specialization &&
    specialization !== "all"
  ) {
    queryKeywords = `${program} ${specialization}`.trim();
  } else {
    queryKeywords = DEFAULT_KEYWORDS;
  }
  // Stored feed listings are matched on these terms (the default list means "no keyword filter").
  const externalKeywords = queryKeywords === DEFAULT_KEYWORDS ? "" : queryKeywords;

  const rawOppType = (opportunityType || "all").toLowerCase().replace(/[-_ ]/g, "");
  let normalizedOppType = "all";
  if (rawOppType === "internship" || rawOppType === "intern") {
    normalizedOppType = "internship";
  } else if (rawOppType === "fulltime" || rawOppType === "job") {
    normalizedOppType = "fulltime";
  } else if (rawOppType === "parttime") {
    normalizedOppType = "parttime";
  }

  if (normalizedOppType === "internship") {
    if (!queryKeywords.toLowerCase().includes("intern")) {
      queryKeywords += " Intern";
    }
  } else if (normalizedOppType === "fulltime") {
    if (
      !queryKeywords.toLowerCase().includes("associate") &&
      !queryKeywords.toLowerCase().includes("engineer")
    ) {
      queryKeywords += " Associate";
    }
  } else if (normalizedOppType === "parttime") {
    queryKeywords += " Part-Time";
  }

  let targetLocation = "India";
  const normRegion = (region || "").trim().toLowerCase();
  if (normRegion === "international") {
    targetLocation = "Worldwide";
  } else if (normRegion === "delhi ncr" || normRegion === "delhi") {
    targetLocation = "Delhi NCR, India";
  } else if (normRegion === "bangalore" || normRegion === "bengaluru") {
    targetLocation = "Bengaluru, Karnataka, India";
  } else if (normRegion === "hyderabad") {
    targetLocation = "Hyderabad, Telangana, India";
  } else if (normRegion === "mumbai") {
    targetLocation = "Mumbai, Maharashtra, India";
  } else if (normRegion === "pune") {
    targetLocation = "Pune, Maharashtra, India";
  } else if (normRegion === "chennai") {
    targetLocation = "Chennai, Tamil Nadu, India";
  } else if (normRegion === "kolkata") {
    targetLocation = "Kolkata, West Bengal, India";
  } else if (normRegion === "chandigarh") {
    targetLocation = "Chandigarh, Punjab, India";
  } else if (normRegion === "jaipur") {
    targetLocation = "Jaipur, Rajasthan, India";
  } else if (normRegion && normRegion !== "all") {
    targetLocation = `${region}, India`;
  }

  const cacheKey = `${queryKeywords}_${targetLocation}_${scope}_${workMode}_${normalizedOppType}_${source}_${region}`;

  if (
    searchCache[cacheKey] &&
    Date.now() - searchCache[cacheKey].timestamp < 30 * 60 * 1000
  ) {
    return {
      source: "in-memory-cache",
      count: searchCache[cacheKey].data.length,
      data: searchCache[cacheKey].data,
    };
  }

  let scrapedResults = [];

  // External listings come from MongoDB (scheduled feed sync), never from a live request.
  if (scope !== "on-campus" && source !== "campus") {
    scrapedResults = await findStoredExternalOpportunities({ keywords: externalKeywords, source });
  }

  // =========================================================================
  // MULTI-TIER GEOGRAPHIC SCRUBBING
  // =========================================================================
  if (region && region !== "all") {
    const regLower = region.trim().toLowerCase();
    scrapedResults = scrapedResults.filter((job) => {
      const fullLocation =
        `${job.location || ""} ${job.company || ""}`.toLowerCase();
      const isRemote =
        (job.workMode || "").toLowerCase().includes("remote") ||
        fullLocation.includes("remote") ||
        fullLocation.includes("work from home");

      if (regLower === "international") {
        const hasIndianKeyword = INDIAN_GEO_KEYWORDS.some((keyword) =>
          fullLocation.includes(keyword),
        );
        return !hasIndianKeyword;
      }

      if (regLower === "delhi ncr" || regLower === "delhi") {
        return (
          isRemote ||
          fullLocation.includes("delhi") ||
          fullLocation.includes("noida") ||
          fullLocation.includes("gurgaon") ||
          fullLocation.includes("gurugram") ||
          fullLocation.includes("panipat") ||
          fullLocation.includes("faridabad") ||
          fullLocation.includes("ghaziabad")
        );
      }

      if (regLower === "bangalore" || regLower === "bengaluru") {
        return (
          isRemote ||
          fullLocation.includes("bengaluru") ||
          fullLocation.includes("bangalore") ||
          fullLocation.includes("karnataka")
        );
      }

      if (regLower === "hyderabad") {
        return (
          isRemote ||
          fullLocation.includes("hyderabad") ||
          fullLocation.includes("secunderabad") ||
          fullLocation.includes("telangana")
        );
      }

      if (regLower === "pune") {
        return (
          isRemote ||
          fullLocation.includes("pune") ||
          fullLocation.includes("maharashtra")
        );
      }

      if (regLower === "mumbai") {
        return (
          isRemote ||
          fullLocation.includes("mumbai") ||
          fullLocation.includes("navi mumbai") ||
          fullLocation.includes("thane") ||
          fullLocation.includes("maharashtra")
        );
      }

      if (regLower === "chennai") {
        return (
          isRemote ||
          fullLocation.includes("chennai") ||
          fullLocation.includes("tamil nadu")
        );
      }

      if (regLower === "kolkata") {
        return (
          isRemote ||
          fullLocation.includes("kolkata") ||
          fullLocation.includes("west bengal")
        );
      }

      if (regLower === "chandigarh") {
        return (
          isRemote ||
          fullLocation.includes("chandigarh") ||
          fullLocation.includes("mohali") ||
          fullLocation.includes("panchkula") ||
          fullLocation.includes("punjab")
        );
      }

      if (regLower === "jaipur") {
        return (
          isRemote ||
          fullLocation.includes("jaipur") ||
          fullLocation.includes("rajasthan")
        );
      }

      return isRemote || fullLocation.includes(regLower);
    });
  }

  // STRICT WORK MODE FILTER
  if (workMode !== "all") {
    scrapedResults = scrapedResults.filter((job) => {
      const mode = (job.workMode || "").toLowerCase();
      const title = (job.title || "").toLowerCase();
      const loc = (job.location || "").toLowerCase();

      if (workMode === "Remote") {
        return (
          mode.includes("remote") ||
          title.includes("remote") ||
          loc.includes("remote") ||
          loc.includes("work from home")
        );
      }
      if (workMode === "On-Site") {
        return (
          !mode.includes("remote") &&
          !title.includes("remote") &&
          !loc.includes("work from home")
        );
      }
      return true;
    });
  }

  // STRICT OPPORTUNITY TYPE FILTER
  if (normalizedOppType !== "all") {
    scrapedResults = scrapedResults.filter((job) => {
      const t = (job.title || "").toLowerCase();
      const oppType = (job.opportunityType || "").toLowerCase();

      if (normalizedOppType === "internship") {
        return (
          oppType.includes("intern") ||
          t.includes("intern") ||
          t.includes("trainee")
        );
      }
      if (normalizedOppType === "fulltime") {
        return (
          !t.includes("intern") &&
          !oppType.includes("intern") &&
          !t.includes("part-time") &&
          !oppType.includes("part-time")
        );
      }
      if (normalizedOppType === "parttime") {
        return (
          t.includes("part-time") ||
          t.includes("part time") ||
          oppType.includes("part-time") ||
          t.includes("freelance")
        );
      }
      return true;
    });
  }

  // Query Real MongoDB Opportunities
  let dbOpportunities = [];
  if (mongoose.connection.readyState === 1) {
    try {
      // Campus listings only: stored feed listings are added separately (scrapedResults).
      const jobFilter = openListingQuery({ isExternal: { $ne: true } });
      const internFilter = openListingQuery({ isExternal: { $ne: true } });

      if (customQuery) {
        const sRegex = new RegExp(escapeRegex(customQuery), "i");
        jobFilter.$or = [
          { title: sRegex },
          { description: sRegex },
          { requiredSkills: { $in: [sRegex] } },
        ];
        internFilter.$or = [
          { title: sRegex },
          { description: sRegex },
          { skillsRequired: { $in: [sRegex] } },
        ];
      }

      if (workMode && workMode !== "all") {
        jobFilter.workMode = workMode === "Remote" ? "Remote" : { $ne: "Remote" };
        internFilter.workMode = workMode;
      }

      const isInternshipRequested =
        opportunityType === "internship" ||
        opportunityType === "internships";
      const isJobRequested =
        opportunityType === "job" ||
        opportunityType === "jobs" ||
        opportunityType === "fulltime" ||
        opportunityType === "full-time" ||
        opportunityType === "parttime" ||
        opportunityType === "part-time";

      let dbJobs = [];
      let dbInterns = [];

      if (!isInternshipRequested) {
        // Query jobs (exclude internships)
        const pureJobFilter = {
          ...jobFilter,
          employmentType: { $not: /^internship$/i },
        };
        if (opportunityType === "parttime" || opportunityType === "part-time") {
          pureJobFilter.employmentType = { $regex: /part-time/i };
        } else if (opportunityType === "fulltime" || opportunityType === "full-time") {
          pureJobFilter.employmentType = { $regex: /full-time/i };
        }
        dbJobs = await Job.find(pureJobFilter)
          .populate("employerId", "companyName logo headquarters industry")
          .sort({ createdAt: -1 })
          .limit(500)
          .lean();
      }

      if (!isJobRequested) {
        // Query internships from both Internship collection and Job collection with employmentType=Internship
        const [internDocs, jobInternDocs] = await Promise.all([
          Internship.find(internFilter)
            .populate("employerId", "companyName logo headquarters industry")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean(),
          Job.find({
            ...jobFilter,
            employmentType: { $regex: /^internship$/i },
          })
            .populate("employerId", "companyName logo headquarters industry")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean(),
        ]);
        dbInterns = [...(internDocs || []), ...(jobInternDocs || [])];
      }

      const formattedJobs = dbJobs.map((j) => ({
        _id: j._id.toString(),
        id: j._id.toString(),
        title: j.title,
        company: j.employerId?.companyName || "E2Job Partner",
        location: j.location || "On-Campus / Hybrid",
        opportunityType: j.employmentType || "Full-Time",
        workMode: j.workMode || "On-Site",
        salary: j.salaryRange?.max
          ? `₹${(j.salaryRange.min / 100000).toFixed(1)} - ${(j.salaryRange.max / 100000).toFixed(1)} LPA`
          : "Competitive Package",
        stipend: j.salaryRange?.max
          ? `₹${(j.salaryRange.min / 100000).toFixed(1)} - ${(j.salaryRange.max / 100000).toFixed(1)} LPA`
          : "Competitive Package",
        description: j.description,
        skills: j.requiredSkills || [],
        skillsRequired: j.requiredSkills || [],
        deadline: j.deadline ? new Date(j.deadline).toLocaleDateString() : "Open",
        postedDate: j.createdAt
          ? new Date(j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Recently",
        applyLink: `/jobs/${j._id}`,
        isExclusive: true,
        isExternal: false,
        platformSource: "GU Placement Cell",
        type: "job",
        employerId: j.employerId?._id || j.employerId,
      }));

      const formattedInterns = dbInterns.map((i) => ({
        _id: i._id.toString(),
        id: i._id.toString(),
        title: i.title,
        company: i.companyName || i.employerId?.companyName || "E2Job Partner",
        location: i.location || "Panipat / Remote",
        opportunityType: "Internship",
        workMode: i.workMode || "On-Site",
        salary: i.stipend ? `₹${i.stipend}/month` : "Paid Internship",
        stipend: i.stipend ? `₹${i.stipend}/month` : "Paid Internship",
        description: i.description,
        skills: i.skillsRequired || i.requiredSkills || [],
        skillsRequired: i.skillsRequired || i.requiredSkills || [],
        deadline: i.applicationDeadline || i.deadline
          ? new Date(i.applicationDeadline || i.deadline).toLocaleDateString()
          : "Open",
        postedDate: i.createdAt
          ? new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Recently",
        applyLink: `/internships/${i._id}`,
        isExclusive: true,
        isExternal: false,
        platformSource: "GU Placement Cell",
        type: "internship",
        employerId: i.employerId?._id || i.employerId,
      }));

      dbOpportunities = [...formattedJobs, ...formattedInterns];
    } catch (err) {
      console.warn("Error querying MongoDB opportunities:", err.message);
    }
  }

  // Merge On-Campus Drives & Database Opportunities
  let combinedResults = [];
  if (source === "external") {
    // Strictly external scraped opportunities only (NO campus / DB items)
    combinedResults = [...scrapedResults];
  } else if (source === "campus" || scope === "on-campus") {
    // Strictly employer-listed campus opportunities only (NO external scrapers)
    combinedResults = [...dbOpportunities];
  } else {
    // All sources: Campus listings first, followed by external scraped listings
    combinedResults = [...dbOpportunities, ...scrapedResults];
  }

  for (const [key, entry] of Object.entries(searchCache)) {
    if (Date.now() - entry.timestamp >= 30 * 60 * 1000) delete searchCache[key];
  }
  while (Object.keys(searchCache).length >= MAX_CACHE_ENTRIES) {
    delete searchCache[Object.keys(searchCache)[0]];
  }
  searchCache[cacheKey] = {
    timestamp: Date.now(),
    data: combinedResults,
  };

  return {
    source: "database",
    count: combinedResults.length,
    data: combinedResults,
  };
}

// Metadata helper for UI filters
function getFilterMetadata() {
  return {
    programs: ["all", ...Object.keys(COURSE_KEYWORD_MAP)],
    specializations: ["all", ...Object.keys(SPECIALIZATION_KEYWORD_MAP)],
    regions: [
      "all",
      "India",
      "Delhi NCR",
      "Bangalore",
      "Pune",
      "Chandigarh",
      "International",
    ],
    sources: [
      { id: "all", label: "All Sources" },
      { id: "remotive", label: "Remotive Remote" },
      { id: "arbeitnow", label: "Arbeitnow Global" },
      { id: "campus", label: "GU Campus Drives" },
    ],
    opportunityTypes: [
      { id: "all", label: "All Types" },
      { id: "internship", label: "Internship" },
      { id: "fulltime", label: "Full-Time Job" },
      { id: "parttime", label: "Part-Time Job" },
    ],
    workModes: [
      { id: "all", label: "All Modes" },
      { id: "Remote", label: "Remote" },
      { id: "On-Site", label: "On-Site / Hybrid" },
    ],
  };
}

module.exports = {
  COURSE_KEYWORD_MAP,
  SPECIALIZATION_KEYWORD_MAP,
  INDIAN_GEO_KEYWORDS,
  CAMPUS_DRIVES,
  findStoredExternalOpportunities,
  getAggregatedOpportunities,
  getFilterMetadata,
  clearSearchCache,
};
