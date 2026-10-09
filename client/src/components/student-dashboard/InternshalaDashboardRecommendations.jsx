import { useState } from "react";
import { Link } from "react-router-dom";
import { FEATURES } from "../../config/features";
import OpportunityTitleLink from "../common/OpportunityTitleLink";
import ViewDetailsButton from "../common/ViewDetailsButton";

const EmptyOpportunityCard = ({ type, href }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between min-h-[290px]">
    <div>
      <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-600">
        {type === "job" ? "💼 JOBS" : "🎓 INTERNSHIPS"}
      </span>
      <h3 className="text-lg font-bold text-slate-900 mt-5">You’re all caught up</h3>
      <p className="text-sm text-slate-600 mt-2">
        New {type === "job" ? "jobs" : "internships"} will appear here as they become available.
      </p>
    </div>
    <Link to={href} className="mt-6 inline-flex justify-center rounded-xl bg-[#1e3a8a] px-4 py-3 text-xs font-bold text-white hover:bg-[#1e40af]">
      Explore all {type === "job" ? "jobs" : "internships"} →
    </Link>
  </div>
);

const FALLBACK_COURSE = {
  id: "crs-fb-1",
  title: "Full Stack Web Development Masterclass",
  provider: "E2Job Academy",
  duration: "8 Weeks (Certified)",
  level: "Beginner to Advanced",
  rating: "4.9",
  isFree: true,
  skillsCovered: ["React", "Node.js", "Express", "System Design"],
};


// How many jobs and how many internships the dashboard shows (FL-06).
const PICKS_PER_TYPE = 4;

const idOf = (item) => String(item.id || item._id || item.jobId);

const pickSkills = (item) =>
  [item?.skillsRequired, item?.skills, item?.requiredSkills].find((l) => Array.isArray(l) && l.length) || [];

const payText = (item, isJob) =>
  isJob
    ? item.salary ||
      (item.salaryRange?.min
        ? `₹${item.salaryRange.min.toLocaleString()} - ₹${(item.salaryRange.max || item.salaryRange.min).toLocaleString()}`
        : null)
    : item.stipend || (item.stipendAmount?.min ? `₹${item.stipendAmount.min.toLocaleString()} / month` : null);

const THEME = {
  Job: { badge: "💼 JOB", badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", hover: "hover:border-emerald-500", title: "group-hover:text-emerald-700", logo: "bg-emerald-50 border-emerald-200 text-emerald-700", apply: "bg-emerald-600 hover:bg-emerald-700", applyLabel: "Apply Now" },
  Internship: { badge: "🎓 INTERNSHIP", badgeCls: "bg-blue-50 text-blue-700 border-blue-200", hover: "hover:border-blue-500", title: "group-hover:text-blue-700", logo: "bg-blue-50 border-blue-200 text-blue-700", apply: "bg-[#1e3a8a] hover:bg-blue-700", applyLabel: "Quick Apply" },
};

/** One recommended job or internship. */
const OpportunityCard = ({ item, type, isSaved, isApplied, onSave, onApply }) => {
  const t = THEME[type];
  const isJob = type === "Job";
  const skills = pickSkills(item);
  const pay = payText(item, isJob);
  const applyHref = item.applyLink || item.applyUrl;
  const isExternal = applyHref && /^https?:\/\//.test(applyHref);
  const extra = isJob ? item.type || item.employmentType : item.duration;

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 ${t.hover} hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between gap-4 group min-w-0`}>
      <div>
        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${t.badgeCls}`}>{t.badge}</span>

        <div className="flex items-start justify-between gap-3 mt-3">
          <div className="space-y-1 min-w-0">
            <h3 className={`text-sm font-bold text-slate-900 ${t.title} transition line-clamp-2`}>
              <OpportunityTitleLink item={item} type={type}>{item.title}</OpportunityTitleLink>
            </h3>
            {item.company && <p className="text-xs font-semibold text-slate-600 line-clamp-1">{item.company}</p>}
          </div>
          {item.logo || item.companyLogo ? (
            <img
              src={item.logo || item.companyLogo}
              alt={item.company || ""}
              className="w-10 h-10 rounded-xl object-contain p-1 bg-white border border-slate-200 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className={`w-10 h-10 rounded-xl border font-black text-base flex items-center justify-center shrink-0 ${t.logo}`}>
              {(item.company || item.title || "?")[0]}
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
          {(item.location || item.workMode) && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 shrink-0">📍</span>
              {item.location && <span className="font-medium text-slate-700 line-clamp-1">{item.location}</span>}
              {item.location && item.workMode && <span className="text-slate-300">•</span>}
              {item.workMode && <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{item.workMode}</span>}
            </div>
          )}
          {pay && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold shrink-0">💵</span>
              <span className="font-bold text-emerald-700 line-clamp-1">{pay}</span>
            </div>
          )}
          {extra && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">{isJob ? "💼" : "⏳"}</span>
              <span className="text-slate-500 font-medium">{extra}</span>
            </div>
          )}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
            {skills.slice(0, 3).map((sk, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/80">
                {sk}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Buttons sit side by side when there is room and stack in narrow cards. */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        {/* Saving isn't stored yet (/api/student/save returns 501) */}
        {FEATURES.savedJobs && (
          <button
            type="button"
            onClick={() => onSave && onSave(item)}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
              isSaved ? "bg-amber-50 border-amber-300 text-amber-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
            title={isSaved ? "Saved" : `Save ${type}`}
          >
            {isSaved ? "★" : "☆"}
          </button>
        )}

        <ViewDetailsButton item={item} type={type} className="grow basis-28 py-2.5 px-2" />

        {isApplied ? (
          <button type="button" disabled className="grow basis-28 py-2.5 px-2 bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-not-allowed">
            ✓ Applied
          </button>
        ) : isExternal ? (
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`grow basis-28 text-center py-2.5 px-2 ${t.apply} text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1`}
          >
            <span>Apply Online</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onApply && onApply(item)}
            className={`grow basis-28 py-2.5 px-2 ${t.apply} text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1`}
          >
            <span>{t.applyLabel}</span>
            <span>›</span>
          </button>
        )}
      </div>
    </div>
  );
};

/** A titled row of up to PICKS_PER_TYPE cards, or the empty card. */
const PicksRow = ({ title, items, type, href, onViewAll, savedIds, appliedIds, onSave, onApply }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">{title}</h3>
      <Link to={href} onClick={onViewAll} className="text-xs font-bold text-[#1e3a8a] hover:underline whitespace-nowrap">
        View all {type === "Job" ? "jobs" : "internships"} →
      </Link>
    </div>
    {items.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <OpportunityCard
            key={idOf(item)}
            item={item}
            type={type}
            isSaved={savedIds.includes(item.id || item._id)}
            isApplied={appliedIds.has(idOf(item))}
            onSave={onSave}
            onApply={onApply}
          />
        ))}
      </div>
    ) : (
      <div className="max-w-sm">
        <EmptyOpportunityCard type={type === "Job" ? "job" : "internship"} href={href} />
      </div>
    )}
  </div>
);

const InternshalaDashboardRecommendations = ({
  jobs = [],
  internships = [],
  courses = [],
  savedIds = [],
  appliedJobIds = new Set(),
  appliedInternshipIds = new Set(),
  onSave,
  onApply,
  onNavigateTab,
}) => {
  const [activeCategory, setActiveCategory] = useState("all");

  // Up to PICKS_PER_TYPE of each that the candidate hasn't applied to yet.
  const jobPicks = jobs.filter((job) => !appliedJobIds.has(idOf(job))).slice(0, PICKS_PER_TYPE);
  const internshipPicks = internships.filter((i) => !appliedInternshipIds.has(idOf(i))).slice(0, PICKS_PER_TYPE);
  const topCourse = courses && courses.length > 0 ? courses[0] : FALLBACK_COURSE;
  const courseSkills = topCourse.skillsCovered || topCourse.skills || ["Full Stack", "Live Projects"];

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
      {/* ================= 1. INTERNSHALA "TRENDING NOW" BANNER ROW ================= */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Explore opportunities
            </h2>
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shadow-xs">
              📈
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
            Open roles for students and freshers
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${FEATURES.courses ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {/* Banner 1: Internships */}
          <Link
            to="/internships"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#0a2540] via-[#123e74] to-[#1e58a8] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400/20 text-blue-200 border border-blue-300/30 uppercase tracking-wide">
                INTERNSHIPS
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-[#facc15] transition leading-snug line-clamp-1">
                Internships for students
              </h3>
              <p className="text-xs text-blue-100/80 mt-1">Paid, remote and in-office internships</p>
            </div>
            <span className="text-xs font-bold text-[#facc15] mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore Internships</span>
              <span>→</span>
            </span>
          </Link>

          {/* Banner 2: Jobs */}
          <Link
            to="/jobs"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#075985] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-sky-300/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30 uppercase tracking-wide">
                JOBS
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-amber-300 transition leading-snug line-clamp-1">
                Jobs for freshers
              </h3>
              <p className="text-xs text-sky-100/90 mt-1">Entry-level and fresher openings</p>
            </div>
            <span className="text-xs font-bold text-sky-200 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore jobs</span>
              <span>→</span>
            </span>
          </Link>

          {/* Banner 3: Courses */}
          {FEATURES.courses && (
          <Link
            to="/courses"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#6d28d9] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-purple-400/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-300/20 text-purple-200 border border-purple-300/30 uppercase tracking-wide">
                COURSES
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-purple-200 transition leading-snug line-clamp-1">
                Certified Career Tracks
              </h3>
              <p className="text-xs text-purple-100/80 mt-1">Explore practical courses for your goals</p>
            </div>
            <span className="text-xs font-bold text-purple-200 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore Courses</span>
              <span>→</span>
            </span>
          </Link>
          )}

        </div>
      </div>

      {/* ================= 2. INTERNSHALA RECOMMENDED SECTION ================= */}
      <div className="space-y-4">
        {/* Header + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Recommended For You
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {jobPicks.length || internshipPicks.length ? "Fresh picks for you" : "Check back for new picks"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized matches curated according to your skills and branch
            </p>
          </div>

          {/* Category Tabs (Mobile scrollable) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none self-start sm:self-auto max-w-full">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategory("job")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "job"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💼 Job
            </button>
            <button
              onClick={() => setActiveCategory("internship")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "internship"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🎓 Internship
            </button>
             {FEATURES.courses && (
            <button
              onClick={() => setActiveCategory("course")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "course"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📚 Course
            </button>
             )}
          </div>
        </div>

        {/* Jobs and internships: up to 4 each (FL-06) */}
        <div className="space-y-6">
          {(activeCategory === "all" || activeCategory === "job") && (
            <PicksRow
              title="Jobs for you"
              items={jobPicks}
              type="Job"
              href="/jobs"
              savedIds={savedIds}
              appliedIds={appliedJobIds}
              onSave={onSave}
              onApply={onApply}
            />
          )}

          {(activeCategory === "all" || activeCategory === "internship") && (
            <PicksRow
              title="Internships for you"
              items={internshipPicks}
              type="Internship"
              href="/internships"
              onViewAll={() => onNavigateTab && onNavigateTab("internships")}
              savedIds={savedIds}
              appliedIds={appliedInternshipIds}
              onSave={onSave}
              onApply={onApply}
            />
          )}
        </div>

        <div className="grid grid-cols-1 max-w-sm gap-5">
          {/* ================= CARD 3: RECOMMENDED COURSE ================= */}
                    {FEATURES.courses && (activeCategory === "all" || activeCategory === "course") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-500 hover:shadow-xl transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between gap-4 group">
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                    📚 COURSE • #1 PICK
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <span>★</span>
                    <span>{topCourse.rating ? `${topCourse.rating} Rating` : "Not yet rated"}</span>
                  </span>
                </div>

                {/* Provider & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition line-clamp-1">
                      {topCourse.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                      {topCourse.provider || "E2Job Academy"}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-black text-xl flex items-center justify-center shrink-0">
                    🎓
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-slate-100 my-3.5" />

                {/* Metadata List with Icons */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">⏱</span>
                    <span className="font-medium text-slate-700">
                      {topCourse.duration || "6-8 Weeks"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      {topCourse.level || "All Levels"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold shrink-0">🏷</span>
                    <span className="font-bold text-purple-700">
                      {topCourse.isFree ? "100% FREE with Certificate" : "University Certified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">📜</span>
                    <span className="text-slate-500 font-medium line-clamp-1">
                      Industry Live Projects Included
                    </span>
                  </div>
                </div>

                {/* Skills Tags */}
                {courseSkills && courseSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    {courseSkills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200/60"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  <Link
                    to={topCourse.id || topCourse._id ? `/courses/${topCourse.id || topCourse._id}` : "/courses"}
                    className="w-full text-center py-2.5 px-3 bg-[#1e3a8a] hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <span>View Course & Enroll</span>
                    <span>›</span>
                  </Link>
                </div>

                {/* Footer Explorer Link */}
                <div className="text-center pt-2.5 border-t border-slate-50 mt-2.5">
                  <Link
                    to="/courses"
                    className="text-[11px] font-bold text-purple-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore all courses →</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternshalaDashboardRecommendations;
