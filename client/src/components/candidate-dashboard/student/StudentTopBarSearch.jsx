import InternshipDiscoveryMenu from "../../internships/InternshipDiscoveryMenu";

/** The student dashboard's part of the shared top bar: welcome line, category menu and search. */
const StudentTopBarSearch = ({ user, profile, searchQuery, onSearchChange, placeholder }) => (
  <>
    <div className="hidden xl:block shrink-0">
      <h1 className="text-base font-bold text-slate-900 leading-tight">Welcome back, {user?.fullName || "Student"}!</h1>
      <p className="text-xs text-slate-500">Build your profile and discover your next opportunity.</p>
    </div>

    <div className="hidden md:block shrink-0">
      <InternshipDiscoveryMenu studentCity={profile?.location?.city || ""} />
    </div>

    <div className="flex-1 max-w-md relative">
      <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder || "Search jobs, internships, courses, skills..."}
        aria-label="Search your dashboard"
        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
      />
    </div>
  </>
);

export default StudentTopBarSearch;
