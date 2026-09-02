const axios = require("axios");
const Internship = require("../models/Internship");

async function fetchAdzunaInternships({
  what = "internship",
  where = "India",
  page = 1,
} = {}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn("Adzuna keys missing");
    return [];
  }

  const { data } = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/in/search/${page}`,
    {
      params: {
        app_id: appId,
        app_key: appKey,
        what,
        where,
        results_per_page: 20,
      },
      timeout: 15000,
    }
  );

  return (data.results || []).map((job) => ({
    title: (job.title || "Internship").slice(0, 150),
    companyName: job.company?.display_name || "Company",
    location: job.location?.display_name || where,
    workMode: /remote/i.test(`${job.title} ${job.description || ""}`)
      ? "Remote"
      : "On-site",
    description: (job.description || "No description").slice(0, 5000),
    stipend: job.salary_min
      ? `₹${Math.round(job.salary_min).toLocaleString("en-IN")}${
          job.salary_max
            ? `–${Math.round(job.salary_max).toLocaleString("en-IN")}`
            : ""
        }`
      : "Not disclosed",
    stipendAmount: {
      min: job.salary_min || 0,
      max: job.salary_max || 0,
      currency: "INR",
    },
    requiredSkills: [],
    source: "Adzuna",
    isExternal: true,
    externalId: String(job.id),
    applyUrl: job.redirect_url || "",
    status: "Published",
    employerId: null,
    createdBy: null,
  }));
}

async function fetchRemotiveInternships(search = "intern") {
  const { data } = await axios.get("https://remotive.com/api/remote-jobs", {
    params: { search, limit: 25 },
    timeout: 15000,
  });

  return (data.jobs || [])
    .filter((j) =>
      /intern|trainee|graduate/i.test(`${j.title} ${j.job_type || ""}`)
    )
    .map((job) => ({
      title: (job.title || "Remote Internship").slice(0, 150),
      companyName: job.company_name || "Company",
      location: job.candidate_required_location || "Remote",
      workMode: "Remote",
      description: (job.description || "No description").slice(0, 5000),
      stipend: "Not disclosed",
      requiredSkills: job.tags || [],
      source: "Remotive",
      isExternal: true,
      externalId: String(job.id),
      applyUrl: job.url || "",
      status: "Published",
      employerId: null,
      createdBy: null,
    }));
}

async function syncExternalInternships() {
  const [adzuna, remotive] = await Promise.all([
    fetchAdzunaInternships().catch((e) => {
      console.error("Adzuna:", e.message);
      return [];
    }),
    fetchRemotiveInternships().catch((e) => {
      console.error("Remotive:", e.message);
      return [];
    }),
  ]);

  const all = [...adzuna, ...remotive];
  let upserted = 0;

  for (const item of all) {
    if (!item.externalId) continue;
    await Internship.findOneAndUpdate(
      { source: item.source, externalId: item.externalId },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted++;
  }

  return { fetched: all.length, upserted };
}

module.exports = {
  fetchAdzunaInternships,
  fetchRemotiveInternships,
  syncExternalInternships,
};