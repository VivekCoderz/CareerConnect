import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import internshipService from "../../services/internshipService";

const InternshipDiscoveryMenu = ({ studentCity = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryData, setCategoryData] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await internshipService.getInternshipCategories();
        if (res?.success && res?.data) {
          setCategoryData(res.data);
        }
      } catch (err) {
        // Fallback gracefully without breaking
      }
    };
    fetchCounts();
  }, []);

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

  const cityCounts = categoryData?.cityCounts || {};
  const catCounts = categoryData?.categoryCounts || {};

  const topLocations = [
    { label: "Work From Home", path: "/internships/work-from-home", count: categoryData?.workFromHomeCount, badge: "Popular" },
    { label: "Internships in Bangalore", path: "/internships/in/bangalore", count: cityCounts["Bangalore"] },
    { label: "Internships in Delhi", path: "/internships/in/delhi", count: cityCounts["Delhi"] },
    { label: "Internships in Hyderabad", path: "/internships/in/hyderabad", count: cityCounts["Hyderabad"] },
    { label: "Internships in Mumbai", path: "/internships/in/mumbai", count: cityCounts["Mumbai"] },
    { label: "Internships in Chennai", path: "/internships/in/chennai", count: cityCounts["Chennai"] },
    { label: "Internships in Pune", path: "/internships/in/pune", count: cityCounts["Pune"] },
    { label: "Internships in Kolkata", path: "/internships/in/kolkata", count: cityCounts["Kolkata"] },
    { label: "Internships in Jaipur", path: "/internships/in/jaipur", count: cityCounts["Jaipur"] },
    { label: "International Internships", path: "/internships/international", count: categoryData?.internationalCount, badge: "Global" },
    { label: "View All Internships", path: "/internships", count: categoryData?.totalActive },
  ];

  const topCategories = [
    { label: "Web Development", path: "/internships/category/web-development", count: catCounts["Web Development"] },
    { label: "App Development", path: "/internships/category/app-development", count: catCounts["App Development"] },
    { label: "Software Development", path: "/internships/category/software-development", count: catCounts["Software Development"] },
    { label: "Data Science", path: "/internships/category/data-science", count: catCounts["Data Science"] },
    { label: "Machine Learning & AI", path: "/internships/category/machine-learning", count: catCounts["Machine Learning"] },
    { label: "UI/UX Design", path: "/internships/category/ui-ux-design", count: catCounts["UI/UX Design"] },
    { label: "Digital Marketing", path: "/internships/category/digital-marketing", count: catCounts["Digital Marketing"] },
    { label: "Content Writing", path: "/internships/category/content-writing", count: catCounts["Content Writing"] },
    { label: "Graphic Design", path: "/internships/category/graphic-design", count: catCounts["Graphic Design"] },
    { label: "Human Resources (HR)", path: "/internships/category/hr", count: catCounts["HR"] },
    { label: "Finance & Accounting", path: "/internships/category/finance", count: catCounts["Finance"] },
    { label: "Sales & Business Dev", path: "/internships/category/sales", count: catCounts["Sales"] },
    { label: "React.js Internships", path: "/internships/category/react", count: catCounts["React"] },
    { label: "Python Internships", path: "/internships/category/python", count: catCounts["Python"] },
    { label: "Java Internships", path: "/internships/category/java", count: catCounts["Java"] },
  ];

  const exploreMore = [
    { label: "Latest Internships", path: "/internships/latest", count: categoryData?.totalActive, icon: "⚡" },
    { label: "Remote / Work From Home", path: "/internships/work-from-home", count: categoryData?.workFromHomeCount, icon: "🏠" },
    { label: "Paid Internships", path: "/internships/paid", count: categoryData?.paidCount, icon: "💰" },
    { label: "Internships with Job Offer (PPO)", path: "/internships/with-job-offer", count: categoryData?.withJobOfferCount, icon: "🎯" },
    { label: "International Internships", path: "/internships/international", count: categoryData?.internationalCount, icon: "🌍" },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/40 transition shadow-2xs"
      >
        <span>🎓 Internships</span>
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
        <div className="absolute left-0 mt-2 w-[720px] max-w-[95vw] bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-50 p-6 animate-slide-in-top">
          {/* Personalized Location Header if studentCity exists */}
          {studentCity && (
            <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Recommended for you in <span className="font-bold text-blue-600">{studentCity}</span>:
              </span>
              <Link
                to={`/internships/in/${studentCity.toLowerCase()}`}
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                View {studentCity} Openings →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Top Locations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Top Locations
                </p>
                <span className="text-[10px] font-bold text-blue-600">📍 Explore</span>
              </div>
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {topLocations.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition group"
                  >
                    <span className="group-hover:font-semibold truncate">{item.label}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-[#92400e] text-[9.5px] font-bold">
                          {item.badge}
                        </span>
                      )}
                      {item.count !== undefined && item.count > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold group-hover:text-blue-600">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 2: Top Categories */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Top Categories
                </p>
                <span className="text-[10px] font-bold text-blue-600">🚀 Roles</span>
              </div>
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {topCategories.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition group"
                  >
                    <span className="group-hover:font-semibold truncate">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold group-hover:text-blue-600">
                        {item.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Explore More & Special Programs */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Explore More
                </p>
                <div className="space-y-1.5">
                  {exploreMore.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-100 hover:border-blue-200 transition group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                          {item.label}
                        </span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 group-hover:border-blue-300 group-hover:text-blue-700">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* View All Button */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  to="/internships"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center block shadow-xs transition"
                >
                  Browse All Internships ({categoryData?.totalActive || "Explore"}) →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipDiscoveryMenu;
