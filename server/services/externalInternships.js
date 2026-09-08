const axios = require("axios");
const Internship = require("../models/Internship");

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
  const remotive = await fetchRemotiveInternships().catch((e) => {
    console.error("Remotive:", e.message);
    return [];
  });

  const all = [...remotive];
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
  fetchRemotiveInternships,
  syncExternalInternships,
};