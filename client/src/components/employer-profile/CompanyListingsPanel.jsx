import JourneyLoader from "../common/JourneyLoader";
import OpportunityTitleLink from "../common/OpportunityTitleLink";
import ViewDetailsButton from "../common/ViewDetailsButton";

// Same card as the job and internship discovery lists, without the company name (this page
// is the company) and without save/apply, which open from "View details".
const ListingCard = ({ item, type }) => {
  const skills = [item.requiredSkills, item.skillsRequired, item.skills].find((l) => Array.isArray(l) && l.length) || [];
  const kind = type === "Internship" ? item.type : item.employmentType || item.type;
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {kind && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {kind}
            </span>
          )}
          <h3 className="text-base font-bold text-slate-900">
            <OpportunityTitleLink item={item} type={type} className="hover:text-blue-700 hover:underline">
              {item.title}
            </OpportunityTitleLink>
          </h3>
          {item.workMode && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              {item.workMode}
            </span>
          )}
          {item.hasJobOffer && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              🎯 With Job Offer (PPO)
            </span>
          )}
          {item.category && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {item.category}
            </span>
          )}
        </div>

        {item.location && <p className="text-xs font-medium text-slate-600">📍 {item.location}</p>}

        {(item.salary || item.duration || item.deadline || item.postedAt) && (
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {item.salary && (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                {item.salary}
              </span>
            )}
            {item.duration && <span>• Duration: {item.duration}</span>}
            {item.deadline && <span>• Apply before: {item.deadline}</span>}
            {!item.deadline && item.postedAt && <span>• Posted: {item.postedAt}</span>}
          </div>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {skills.map((skill, sIdx) => (
              <span
                key={sIdx}
                className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10.5px] font-medium rounded-md border border-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
        <ViewDetailsButton item={item} type={type} />
      </div>
    </div>
  );
};

// A company page's Jobs or Internships tab: loading, error, empty and list states.
const CompanyListingsPanel = ({ title, result, type, emptyText }) => (
  <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    {result.error ? (
      <p className="text-xs text-slate-500">Couldn't load these right now. Please try again later.</p>
    ) : result.items === null ? (
      <div className="py-8 flex flex-col items-center">
        <JourneyLoader size="md" className="mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading...</p>
      </div>
    ) : result.items.length === 0 ? (
      <div className="text-center py-8 space-y-2">
        <div className="text-3xl">📭</div>
        <p className="text-sm font-semibold text-slate-700">{emptyText}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {result.items.map((item) => (
          <ListingCard key={item.id || item._id} item={item} type={type} />
        ))}
        {result.total > result.items.length && (
          <p className="text-xs text-slate-500 text-center">
            Showing the latest {result.items.length} of {result.total}.
          </p>
        )}
      </div>
    )}
  </div>
);

export default CompanyListingsPanel;
