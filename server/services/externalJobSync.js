// Scheduled sync of approved external job feeds into MongoDB (I04).
//
// Request handlers never call external sites: this module fetches the approved feeds on a
// schedule (and on an admin's request), normalises each posting, and upserts it by its
// stable key { source, externalId }. Job lists then read the stored listings like any other.
//
// Approved feeds are fixed here; nothing in a request can add or change a URL.
// LinkedIn and Internshala scraping stays off (S07).

const axios = require("axios");
const cheerio = require("cheerio");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const { startOfTodayIST } = require("../utils/listingExpiry");

const DAY_MS = 24 * 60 * 60 * 1000;
// A listing stays open this long after the feed last showed it, so a missed sync doesn't hide it.
const SEEN_GRACE_DAYS = 3;
// Feed postings older than this are treated as expired even if the feed still lists them.
const MAX_POSTING_AGE_DAYS = 60;
const MAX_ITEMS_PER_FEED = 300;
const REQUEST_TIMEOUT_MS = 15000;
// Remotive asks API users to fetch only a few times a day, so the default is every 6 hours.
const DEFAULT_INTERVAL_HOURS = 6;
// Feed listings closed as expired for longer than this are deleted to keep storage small.
const CLOSED_RETENTION_DAYS = 14;

const FEEDS = {
  Remotive: {
    attribution: "Job listing from Remotive (remotive.com)",
    fetchPages: async (get) => {
      const data = await get("https://remotive.com/api/remote-jobs", { limit: MAX_ITEMS_PER_FEED });
      if (!data || !Array.isArray(data.jobs)) throw new Error("invalid feed response (no jobs array)");
      return data.jobs;
    },
    normalize: (job) => ({
      externalId: job.id,
      title: job.title,
      companyName: job.company_name,
      descriptionHtml: job.description,
      location: job.candidate_required_location || "Worldwide",
      remote: true,
      typeHints: [job.job_type],
      tags: job.tags,
      category: job.category,
      applyUrl: job.url,
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
    }),
  },
  Arbeitnow: {
    attribution: "Job listing from Arbeitnow (arbeitnow.com)",
    fetchPages: async (get) => {
      const items = [];
      for (let page = 1; page <= 3 && items.length < MAX_ITEMS_PER_FEED; page++) {
        const data = await get("https://www.arbeitnow.com/api/job-board-api", { page });
        if (!data || !Array.isArray(data.data)) throw new Error("invalid feed response (no data array)");
        items.push(...data.data);
        if (data.data.length === 0 || !data.links?.next) break;
      }
      return items;
    },
    normalize: (job) => ({
      externalId: job.slug,
      title: job.title,
      companyName: job.company_name,
      descriptionHtml: job.description,
      location: job.location || "Not specified",
      remote: job.remote === true,
      typeHints: Array.isArray(job.job_types) ? job.job_types : [],
      tags: job.tags,
      category: null,
      applyUrl: job.url,
      postedAt: Number.isFinite(job.created_at) ? new Date(job.created_at * 1000) : null,
    }),
  },
};

const APPROVED_SOURCES = Object.keys(FEEDS);

const clean = (value, max) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const htmlToText = (html) => {
  if (typeof html !== "string" || !html.trim()) return "";
  return clean(cheerio.load(html).text(), 5000);
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/** Maps a feed's job-type hints to { isInternship, employmentType } in Job's enum. */
const classifyType = (hints, title) => {
  const text = `${hints.filter((h) => typeof h === "string").join(" ")} ${title}`.toLowerCase();
  if (/intern|trainee/.test(text)) return { isInternship: true, employmentType: "Internship" };
  if (/part[ _-]?time|working student/.test(text)) return { isInternship: false, employmentType: "Part-time" };
  if (/contract/.test(text)) return { isInternship: false, employmentType: "Contract" };
  if (/freelance/.test(text)) return { isInternship: false, employmentType: "Freelance" };
  return { isInternship: false, employmentType: "Full-time" };
};

/**
 * Turns one raw feed posting into the fields stored on Job/Internship, or returns
 * { error } when a required field is missing or invalid.
 */
const normalizeFeedJob = (source, raw, now = new Date()) => {
  const feed = FEEDS[source];
  if (!feed) return { error: `unapproved source "${source}"` };
  if (!raw || typeof raw !== "object") return { error: "malformed record" };

  const item = feed.normalize(raw);
  const externalId = item.externalId === undefined || item.externalId === null ? "" : String(item.externalId).trim();
  const title = clean(item.title, 150);
  if (!externalId) return { error: "missing externalId" };
  if (!title) return { error: `missing title (${externalId})` };
  if (!isHttpUrl(item.applyUrl)) return { error: `invalid applyUrl (${externalId})` };

  const location = clean(item.location, 150) || "Not specified";
  const isIndia = /\bindia\b/i.test(location);
  const { isInternship, employmentType } = classifyType(item.typeHints || [], title);

  // Expiry: open until SEEN_GRACE_DAYS after this sync, but never past MAX_POSTING_AGE_DAYS
  // from the posting date. Stored in `deadline`, so the existing expiry rules apply.
  let deadline = new Date(now.getTime() + SEEN_GRACE_DAYS * DAY_MS);
  const postedAt = item.postedAt instanceof Date && !Number.isNaN(item.postedAt.getTime()) ? item.postedAt : null;
  if (postedAt) {
    const maxAge = new Date(postedAt.getTime() + MAX_POSTING_AGE_DAYS * DAY_MS);
    if (maxAge < deadline) deadline = maxAge;
  }

  const fields = {
    source,
    externalId,
    isExternal: true,
    attribution: feed.attribution,
    lastSyncedAt: now,
    deadline,
    title,
    companyName: clean(item.companyName, 150) || "Company not disclosed",
    description: htmlToText(item.descriptionHtml) || "See the original posting for full details.",
    location,
    city: clean(location.split(/[,/]/)[0], 60) || location,
    state: "",
    country: isIndia ? "India" : "International",
    isInternational: !isIndia,
    workMode: item.remote ? "Remote" : "On-site",
    category: clean(item.category, 100) || "General",
    subCategory: "",
    requiredSkills: (Array.isArray(item.tags) ? item.tags : [])
      .map((tag) => clean(tag, 50))
      .filter(Boolean)
      .slice(0, 15),
    applyUrl: item.applyUrl,
  };
  if (!isInternship) fields.employmentType = employmentType;

  return { isInternship, fields };
};

const fetchFeed = async (source) => {
  const get = async (url, params) => {
    const res = await axios.get(url, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: 20 * 1024 * 1024,
      headers: { Accept: "application/json", "User-Agent": "CareerConnectJobSync/1.0" },
    });
    return res.data;
  };
  const items = await FEEDS[source].fetchPages(get);
  return items.slice(0, MAX_ITEMS_PER_FEED);
};

const describeFetchError = (err) => {
  const status = err.response?.status;
  if (status === 429) return "rate limited (HTTP 429)";
  if (status) return `HTTP ${status}`;
  if (err.code === "ECONNABORTED" || /timeout/i.test(err.message)) return "timed out";
  return err.message;
};

/** Upserts one normalised listing by { source, externalId }. Returns "inserted" or "updated". */
const upsertListing = async (Model, fields) => {
  const filter = { source: fields.source, externalId: fields.externalId };
  const update = {
    $set: fields,
    // Feed listings are published without moderation (only platform admins can trigger a sync).
    // Status is set on insert only, so a listing an admin rejected or paused stays that way.
    $setOnInsert: { status: "Published", employerId: null, createdBy: null },
  };
  const options = { upsert: true, runValidators: true, setDefaultsOnInsert: true, includeResultMetadata: true };
  try {
    const result = await Model.findOneAndUpdate(filter, update, options);
    return result.lastErrorObject?.updatedExisting ? "updated" : "inserted";
  } catch (err) {
    // Two syncs racing on the same new listing: the other insert won, so update it instead.
    if (err.code !== 11000) throw err;
    await Model.findOneAndUpdate(filter, update, { ...options, upsert: false });
    return "updated";
  }
};

const syncSource = async (source, now) => {
  const stats = { fetched: 0, inserted: 0, updated: 0, invalid: 0, failed: 0, error: null };
  let rawItems;
  try {
    rawItems = await fetchFeed(source);
  } catch (err) {
    stats.error = describeFetchError(err);
    console.warn(`[job-sync] ${source}: fetch failed: ${stats.error}`);
    return stats;
  }
  stats.fetched = rawItems.length;

  // The same posting twice in one feed response is written once.
  const unique = new Map();
  for (const raw of rawItems) {
    const normalized = normalizeFeedJob(source, raw, now);
    if (normalized.error) {
      stats.invalid++;
      continue;
    }
    unique.set(normalized.fields.externalId, normalized);
  }

  const seen = { job: [], internship: [] };
  for (const { isInternship, fields } of unique.values()) {
    try {
      const outcome = await upsertListing(isInternship ? Internship : Job, fields);
      stats[outcome]++;
      seen[isInternship ? "internship" : "job"].push(fields.externalId);
    } catch (err) {
      stats.failed++;
      if (stats.failed <= 3) console.warn(`[job-sync] ${source} ${fields.externalId}: ${err.message}`);
    }
  }

  // A listing the expiry sweep closed but the feed still shows (and is within its new
  // deadline) is open again.
  const reopen = (Model, ids) => ids.length === 0 ? null : Model.updateMany(
    {
      source,
      isExternal: true,
      externalId: { $in: ids },
      status: "Closed",
      closedReason: "expired",
      deadline: { $gte: startOfTodayIST(now) },
    },
    { $set: { status: "Published", closedReason: null, closedAt: null } }
  );
  await Promise.all([reopen(Job, seen.job), reopen(Internship, seen.internship)]);

  return stats;
};

/**
 * Deletes feed listings (jobs and internships) the expiry sweep closed more than
 * CLOSED_RETENTION_DAYS ago. CareerConnect listings, open listings and listings closed for
 * any other reason (e.g. by an admin) are kept. Safe to run repeatedly.
 */
const deleteOldClosedFeedListings = async ({ now = new Date() } = {}) => {
  const filter = {
    isExternal: true,
    source: { $in: APPROVED_SOURCES },
    status: "Closed",
    closedReason: "expired",
    closedAt: { $ne: null, $lt: new Date(now.getTime() - CLOSED_RETENTION_DAYS * DAY_MS) },
  };
  const [jobs, internships] = await Promise.all([Job.deleteMany(filter), Internship.deleteMany(filter)]);
  const result = { jobs: jobs.deletedCount, internships: internships.deletedCount };
  console.log(
    `[job-sync] I04 cleanup: deleted ${result.jobs + result.internships} expired feed listings (jobs: ${result.jobs}, internships: ${result.internships})`
  );
  return result;
};

let running = null;

/**
 * Fetches every approved feed and upserts its listings. Concurrent calls share one run.
 * Never throws for a feed failure: each source reports its own error in the result.
 */
const runExternalJobSync = ({ now = new Date() } = {}) => {
  if (running) return running;
  running = (async () => {
    const startedAt = new Date();
    const sources = {};
    for (const source of APPROVED_SOURCES) {
      sources[source] = await syncSource(source, now);
    }
    const totals = Object.values(sources).reduce(
      (acc, s) => ({
        fetched: acc.fetched + s.fetched,
        inserted: acc.inserted + s.inserted,
        updated: acc.updated + s.updated,
        invalid: acc.invalid + s.invalid,
        failed: acc.failed + s.failed,
      }),
      { fetched: 0, inserted: 0, updated: 0, invalid: 0, failed: 0 }
    );
    // A cleanup failure is logged but never fails the sync.
    let cleanup = null;
    try {
      cleanup = await deleteOldClosedFeedListings({ now });
    } catch (err) {
      console.error("[job-sync] I04 cleanup failed:", err.message);
    }
    // Cached feed results would otherwise hide new listings for up to 30 minutes.
    require("./jobScraperService").clearSearchCache();
    const result = {
      startedAt,
      finishedAt: new Date(),
      ...totals,
      upserted: totals.inserted + totals.updated,
      cleanup,
      sources,
    };
    const perSource = Object.entries(sources)
      .map(([name, s]) => `${name} ${s.error ? `error: ${s.error}` : `${s.fetched} fetched`}`)
      .join("; ");
    console.log(
      `[job-sync] done: ${result.inserted} new, ${result.updated} updated, ${result.invalid} invalid, ${result.failed} failed (${perSource})`
    );
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
};

const getSyncIntervalMs = () => {
  const hours = Number(process.env.EXTERNAL_JOB_SYNC_INTERVAL_HOURS);
  return (Number.isFinite(hours) && hours >= 1 ? hours : DEFAULT_INTERVAL_HOURS) * 60 * 60 * 1000;
};

/** Most recent time any external listing was synced (null if never). */
const getLastSyncedAt = async () => {
  const [job, internship] = await Promise.all([
    Job.findOne({ isExternal: true, lastSyncedAt: { $ne: null } }).sort({ lastSyncedAt: -1 }).select("lastSyncedAt").lean(),
    Internship.findOne({ isExternal: true, lastSyncedAt: { $ne: null } }).sort({ lastSyncedAt: -1 }).select("lastSyncedAt").lean(),
  ]);
  const times = [job?.lastSyncedAt, internship?.lastSyncedAt].filter(Boolean).map((d) => new Date(d).getTime());
  return times.length ? new Date(Math.max(...times)) : null;
};

/** Runs the sync only when the last one is older than the interval (restarts don't refetch). */
const runScheduledSyncIfDue = async () => {
  try {
    const last = await getLastSyncedAt();
    if (last && Date.now() - last.getTime() < getSyncIntervalMs()) return null;
    return await runExternalJobSync();
  } catch (err) {
    console.warn("[job-sync] scheduled run failed:", err.message);
    return null;
  }
};

/**
 * Starts the background schedule (called from server.js). Set ENABLE_EXTERNAL_JOB_SYNC=false
 * to turn it off. Checks every 30 minutes and syncs when the interval has passed.
 */
const startExternalJobSyncSchedule = () => {
  if (String(process.env.ENABLE_EXTERNAL_JOB_SYNC).toLowerCase() === "false") {
    console.log("[job-sync] scheduled external job sync is disabled");
    return null;
  }
  // unref: the HTTP server keeps the process alive; these timers alone shouldn't.
  setTimeout(runScheduledSyncIfDue, 60 * 1000).unref();
  return setInterval(runScheduledSyncIfDue, 30 * 60 * 1000).unref();
};

module.exports = {
  APPROVED_SOURCES,
  normalizeFeedJob,
  runExternalJobSync,
  deleteOldClosedFeedListings,
  runScheduledSyncIfDue,
  startExternalJobSyncSchedule,
  getSyncIntervalMs,
};
