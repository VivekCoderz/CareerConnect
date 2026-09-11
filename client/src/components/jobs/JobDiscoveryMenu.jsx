import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const JobDiscoveryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const topLocations = [
    { label: "Remote / Work From Home", path: "/jobs/work-from-home", badge: "Popular" },
    { label: "Jobs in Bangalore", path: "/jobs/in/bangalore" },
    { label: "Jobs in Delhi NCR", path: "/jobs/in/delhi" },
    { label: "Jobs in Hyderabad", path: "/jobs/in/hyderabad" },
    { label: "Jobs in Mumbai", path: "/jobs/in/mumbai" },
    { label: "Jobs in Pune", path: "/jobs/in/pune" },
    { label: "Jobs in Chennai", path: "/jobs/in/chennai" },
    { label: "View All Jobs", path: "/jobs", badge: "10 per page" },
  ];

  const topCategories = [
    { label: "Software Development", path: "/jobs/category/software-development" },
    { label: "Frontend / Full Stack", path: "/jobs/category/web-development" },
    { label: "Data Science", path: "/jobs/category/data-science" },
    { label: "Machine Learning & AI", path: "/jobs/category/machine-learning" },
    { label: "DevOps & Cloud", path: "/jobs/category/devops" },
    { label: "UI/UX Design", path: "/jobs/category/ui-ux" },
    { label: "Digital Marketing", path: "/jobs/category/digital-marketing" },
    { label: "Human Resources (HR)", path: "/jobs/category/hr" },
    { label: "Finance & Accounts", path: "/jobs/category/finance" },
    { label: "Sales & Business Dev", path: "/jobs/category/sales" },
  ];

  const exploreMore = [
    { label: "Latest & Fresh Jobs", path: "/jobs/latest", icon: "⚡" },
    { label: "Remote Jobs", path: "/jobs/work-from-home", icon: "🏠" },
    { label: "Campus Drives", path: "/opportunities?source=campus", icon: "🎓" },
    { label: "Live Opportunities Matrix", path: "/opportunities", icon: "🚀", badge: "Live" },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/40 transition shadow-2xs"
      >
        <span>💼 Jobs</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : "text-slate-400"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mega Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[700px] max-w-[95vw] bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-50 p-6 animate-slide-in-top">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Explore Jobs by Category & City</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10.5px] font-extrabold">
                  Latest First
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                10 jobs per page with smooth pagination & verified employer postings
              </p>
            </div>
            <Link
              to="/jobs"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              Browse All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            {/* By Location */}
            <div className="space-y-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Top Locations
              </p>
              <div className="space-y-1">
                {topLocations.map((loc, idx) => (
                  <Link
                    key={idx}
                    to={loc.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition"
                  >
                    <span>{loc.label}</span>
                    {loc.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        {loc.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* By Profile / Category */}
            <div className="space-y-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Popular Profiles
              </p>
              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                {topCategories.map((cat, idx) => (
                  <Link
                    key={idx}
                    to={cat.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition"
                  >
                    <span>{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Explore More */}
            <div className="space-y-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Special Streams
              </p>
              <div className="space-y-1.5">
                {exploreMore.map((exp, idx) => (
                  <Link
                    key={idx}
                    to={exp.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-200 transition"
                  >
                    <span className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{exp.icon}</span>
                      <span>{exp.label}</span>
                    </span>
                    {exp.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {exp.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDiscoveryMenu;
