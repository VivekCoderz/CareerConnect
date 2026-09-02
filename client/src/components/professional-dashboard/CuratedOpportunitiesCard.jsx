const DEFAULT_OPPORTUNITIES = [
  {
    id: "opp-1",
    title: "Staff Software Engineer — Distributed Systems",
    company: "Stripe",
    location: "Remote",
    experience: "5+ Years",
    salary: "₹35–50 LPA",
    matchPercentage: 92,
    tags: ["System Design", "AWS", "Distributed Systems"],
  },
  {
    id: "opp-2",
    title: "Engineering Lead (Platform & Architecture)",
    company: "Razorpay",
    location: "Bangalore (Hybrid)",
    experience: "5+ Years",
    salary: "₹45–60 LPA",
    matchPercentage: 95,
    tags: ["System Architecture", "Microservices", "Team Leadership"],
  },
  {
    id: "opp-3",
    title: "Senior Backend Architect",
    company: "Atlassian",
    location: "Remote (India)",
    experience: "6+ Years",
    salary: "₹50–70 LPA",
    matchPercentage: 88,
    tags: ["Distributed Systems", "Kubernetes", "Cloud Architecture"],
  },
];

const CuratedOpportunitiesCard = ({
  opportunities = DEFAULT_OPPORTUNITIES,
  onExploreRole,
}) => {
  const displayList = opportunities.slice(0, 3);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Curated Opportunities</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senior roles matched to your experience and career goals.
          </p>
        </div>
      </div>

      {/* 3 Opportunity Cards */}
      <div className="space-y-4">
        {displayList.map((opp) => (
          <div
            key={opp.id}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20 transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            {/* Left: Role Info & Tags */}
            <div className="space-y-2.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {opp.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                  {opp.matchPercentage || 90}% Match
                </span>
              </div>

              {/* Company, Location, Experience, Salary */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-slate-600 font-medium">
                <span className="font-bold text-slate-900">{opp.company}</span>
                <span className="text-slate-300">·</span>
                <span>{opp.location}</span>
                <span className="text-slate-300">·</span>
                <span>{opp.experience}</span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  {opp.salary}
                </span>
              </div>

              {/* 3-4 Skill Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {opp.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Explore Action Button */}
            <div className="shrink-0 self-start md:self-center">
              <button
                type="button"
                onClick={() => onExploreRole && onExploreRole(opp)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
              >
                <span>Explore Role</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CuratedOpportunitiesCard;
