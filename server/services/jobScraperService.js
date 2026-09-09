const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const EmployerProfile = require("../models/EmployerProfile");

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

function clearSearchCache() {
  for (const key in searchCache) {
    delete searchCache[key];
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

// ==========================================
// 4. MULTI-SOURCE SCRAPERS & APIS
// ==========================================

async function scrapeLinkedIn(queryKeywords, targetLocation, jobTypeParam) {
  const startOffsets = [0, 25];
  const results = [];

  const cleanQuery = queryKeywords
    ? queryKeywords
        .slice(0, 100)
        .replace(/[^\w\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "Developer";

  const requests = startOffsets.map(async (start) => {
    const selectedAgent =
      USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    let searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
      cleanQuery,
    )}&location=${encodeURIComponent(targetLocation || "India")}&start=${start}`;

    const normalizedParam = (jobTypeParam || "").toLowerCase().replace(/[-_ ]/g, "");
    if (normalizedParam === "internship" || normalizedParam === "intern") searchUrl += "&f_JT=I";
    if (normalizedParam === "fulltime" || normalizedParam === "job") searchUrl += "&f_JT=F";
    if (normalizedParam === "parttime") searchUrl += "&f_JT=P";

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": selectedAgent,
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 9000,
      });

      const $ = cheerio.load(response.data);
      const pageData = [];

      $("li").each((_, element) => {
        const title = $(element).find(".base-search-card__title").text().trim();
        const company =
          $(element).find(".base-search-card__subtitle a").text().trim() ||
          $(element).find(".base-search-card__subtitle").text().trim();
        const loc = $(element).find(".job-search-card__location").text().trim();
        const rawLink = $(element).find("a.base-card__full-link").attr("href");
        const posted = $(element).find("time").text().trim() || "Recently";

        if (title && rawLink) {
          const isRemote =
            loc.toLowerCase().includes("remote") ||
            title.toLowerCase().includes("remote");
          const isIntern =
            title.toLowerCase().includes("intern") ||
            title.toLowerCase().includes("trainee");
          const isPart =
            title.toLowerCase().includes("part time") ||
            title.toLowerCase().includes("part-time");

          let derivedType = "Full-Time Job";
          if (isIntern) derivedType = "Internship";
          if (isPart) derivedType = "Part-Time Job";

          pageData.push({
            title,
            company: company || "Verified Employer",
            location: loc || targetLocation || "India",
            type: "LinkedIn Verified",
            platformSource: "LinkedIn",
            opportunityType: derivedType,
            workMode: isRemote ? "Remote" : "On-Site / Hybrid",
            postedDate: posted,
            applyLink: rawLink.split("?")[0],
            isExclusive: false,
          });
        }
      });
      return pageData;
    } catch (e) {
      return [];
    }
  });

  const pages = await Promise.all(requests);
  pages.forEach((p) => results.push(...p));
  return results;
}

async function scrapeInternshala(queryKeywords) {
  try {
    const cleanQuery = queryKeywords
      ? queryKeywords
          .split(" OR ")[0]
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase()
      : "web-development";

    const url = `https://internshala.com/internships/keywords-${cleanQuery}/`;
    const selectedAgent =
      USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const response = await axios.get(url, {
      headers: {
        "User-Agent": selectedAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 6000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $(".individual_internship").each((_, el) => {
      const title = $(el).find(".job-internship-name").text().trim();
      const company = $(el).find(".company-name").text().trim();
      const loc = $(el).find(".row-1-item.locations").text().trim();
      const link = $(el).find(".job-title-href").attr("href");

      if (title && link) {
        const isPart =
          title.toLowerCase().includes("part time") ||
          title.toLowerCase().includes("part-time");

        results.push({
          title,
          company: company || "Internshala Partner",
          location: loc || "India (Multiple)",
          type: "Internshala Portal",
          platformSource: "Internshala",
          opportunityType: isPart ? "Part-Time Job" : "Internship",
          workMode: loc.toLowerCase().includes("work from home")
            ? "Remote"
            : "On-Site / Hybrid",
          postedDate: "Live on Internshala",
          applyLink: link.startsWith("http")
            ? link
            : `https://internshala.com${link}`,
          isExclusive: false,
        });
      }
    });

    return results;
  } catch (err) {
    return [];
  }
}

async function fetchRemotiveJobs(queryKeywords) {
  try {
    let searchWord = "developer";
    if (queryKeywords) {
      const words = queryKeywords
        .split(" ")
        .filter((w) => w.toLowerCase() !== "or" && w.length > 2);
      if (words.length > 0) searchWord = words[0].toLowerCase();
    }

    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(
      searchWord,
    )}&limit=50`;
    const res = await axios.get(url, { timeout: 7000 });

    if (res.data && res.data.jobs) {
      return res.data.jobs.map((j) => {
        let opp = "Full-Time Job";
        if (j.job_type === "internship") opp = "Internship";
        if (j.job_type === "part_time") opp = "Part-Time Job";

        return {
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Worldwide (Remote)",
          type: "Remotive Remote",
          platformSource: "Remotive",
          opportunityType: opp,
          workMode: "Remote",
          postedDate: j.publication_date
            ? j.publication_date.split("T")[0]
            : "Recently",
          applyLink: j.url,
          isExclusive: false,
        };
      });
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function fetchArbeitnowJobs(queryKeywords) {
  try {
    let searchWord = "software";
    if (queryKeywords) {
      const words = queryKeywords
        .split(" ")
        .filter((w) => w.toLowerCase() !== "or" && w.length > 2);
      if (words.length > 0) searchWord = words[0].toLowerCase();
    }

    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(
      searchWord,
    )}`;
    const res = await axios.get(url, { timeout: 7000 });

    if (res.data && res.data.data) {
      return res.data.data.slice(0, 50).map((j) => ({
        title: j.title,
        company: j.company_name,
        location: j.location || "Global / Remote",
        type: "Arbeitnow Global",
        platformSource: "Arbeitnow",
        opportunityType: "Full-Time Job",
        workMode: j.remote ? "Remote" : "On-Site / Hybrid",
        postedDate: "Active",
        applyLink: j.url,
        isExclusive: false,
      }));
    }
    return [];
  } catch (e) {
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
  const customQuery = (search || q || "").trim();

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
    queryKeywords = "Developer OR Engineer OR Analyst OR Trainee";
  }

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
  if (region === "International") {
    targetLocation = "Worldwide";
  } else if (region === "Delhi NCR") {
    targetLocation = "Delhi NCR, India";
  } else if (region === "Bangalore") {
    targetLocation = "Bengaluru, Karnataka, India";
  } else if (region === "Pune") {
    targetLocation = "Pune, Maharashtra, India";
  } else if (region === "Chandigarh") {
    targetLocation = "Chandigarh, Punjab, India";
  } else if (region === "all") {
    targetLocation = "India";
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

  // Trigger selected scrapers
  if (scope !== "on-campus") {
    const scraperPromises = [];

    if (source === "all" || source === "external" || source === "linkedin") {
      scraperPromises.push(
        scrapeLinkedIn(queryKeywords, targetLocation, normalizedOppType),
      );
    }
    if (
      (source === "all" || source === "external" || source === "internshala") &&
      region !== "International"
    ) {
      scraperPromises.push(scrapeInternshala(queryKeywords));
    }
    if (source === "all" || source === "external" || source === "remotive") {
      scraperPromises.push(fetchRemotiveJobs(queryKeywords));
    }
    if (source === "all" || source === "external" || source === "arbeitnow") {
      scraperPromises.push(fetchArbeitnowJobs(queryKeywords));
    }

    const settled = await Promise.allSettled(scraperPromises);
    settled.forEach((res) => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        scrapedResults.push(...res.value);
      }
    });

    // Remove Duplicates
    scrapedResults = Array.from(
      new Map(scrapedResults.map((job) => [job.applyLink, job])).values(),
    );
  }

  // =========================================================================
  // MULTI-TIER GEOGRAPHIC SCRUBBING
  // =========================================================================
  if (region && region !== "all") {
    scrapedResults = scrapedResults.filter((job) => {
      const fullLocation =
        `${job.location || ""} ${job.company || ""}`.toLowerCase();
      const isRemote =
        (job.workMode || "").toLowerCase().includes("remote") ||
        fullLocation.includes("remote") ||
        fullLocation.includes("work from home");

      if (region === "International") {
        const hasIndianKeyword = INDIAN_GEO_KEYWORDS.some((keyword) =>
          fullLocation.includes(keyword),
        );
        return !hasIndianKeyword;
      }

      if (region === "Delhi NCR") {
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

      if (region === "Bangalore") {
        return (
          isRemote ||
          fullLocation.includes("bengaluru") ||
          fullLocation.includes("bangalore") ||
          fullLocation.includes("hyderabad") ||
          fullLocation.includes("karnataka")
        );
      }

      if (region === "Pune") {
        return (
          isRemote ||
          fullLocation.includes("pune") ||
          fullLocation.includes("mumbai") ||
          fullLocation.includes("navi mumbai") ||
          fullLocation.includes("thane") ||
          fullLocation.includes("maharashtra")
        );
      }

      if (region === "Chandigarh") {
        return (
          isRemote ||
          fullLocation.includes("chandigarh") ||
          fullLocation.includes("mohali") ||
          fullLocation.includes("panchkula") ||
          fullLocation.includes("punjab")
        );
      }

      return true;
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

  // Merge On-Campus Drives
  let combinedResults = [];
  if (scope === "all" || scope === "on-campus") {
    if (source === "all" || source === "campus") {
      const filteredDrives = CAMPUS_DRIVES.filter((drive) => {
        if (region === "International") return false;
        if (workMode === "Remote" && drive.workMode !== "Remote") return false;
        if (workMode === "On-Site" && drive.workMode === "Remote") return false;
        if (normalizedOppType === "internship" && drive.opportunityType !== "Internship") return false;
        if (normalizedOppType === "fulltime" && drive.opportunityType !== "Full-Time Job") return false;
        if (customQuery) {
          const qLower = customQuery.toLowerCase();
          const match =
            drive.title.toLowerCase().includes(qLower) ||
            drive.company.toLowerCase().includes(qLower) ||
            drive.location.toLowerCase().includes(qLower);
          if (!match) return false;
        }
        return true;
      });
      combinedResults = [...filteredDrives, ...scrapedResults];
    } else {
      combinedResults = scrapedResults;
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

  searchCache[cacheKey] = {
    timestamp: Date.now(),
    data: combinedResults,
  };

  return {
    source: "live-scrapers",
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
      { id: "linkedin", label: "LinkedIn" },
      { id: "internshala", label: "Internshala" },
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
  scrapeLinkedIn,
  scrapeInternshala,
  fetchRemotiveJobs,
  fetchArbeitnowJobs,
  getAggregatedOpportunities,
  getFilterMetadata,
  clearSearchCache,
};
