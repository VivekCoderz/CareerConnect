import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  Star,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
} from "lucide-react";
import api from "../../api/api";

/**
 * StudentCoursesPage
 * Student course catalog & AI recommendations page.
 */
const StudentCoursesPage = ({ onViewDetails }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [applyingId, setApplyingId] = useState(null);
  const [appliedCourseIds, setAppliedCourseIds] = useState(new Set());

  const fetchRecommendedCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/courses/recommended");
      if (res.data?.success) {
        setCourses(res.data.courses || []);
      }
    } catch (err) {
      console.error("Fetch Recommended Courses Error:", err);
      // Fallback: try fetching all published courses if endpoint fails
      try {
        const catalogRes = await api.get("/courses/my-courses");
        if (catalogRes.data?.success) {
          const published = (catalogRes.data.courses || []).filter(
            (c) => c.status === "Published"
          );
          setCourses(published);
        }
      } catch (fallbackErr) {
        setError("Failed to load recommended courses.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendedCourses();
  }, []);

  const handleApply = async (courseId) => {
    try {
      setApplyingId(courseId);
      const res = await api.post(`/courses/${courseId}/apply`);
      if (res.data?.success) {
        setAppliedCourseIds((prev) => new Set(prev).add(courseId));
      }
    } catch (err) {
      console.error("Apply Course Error:", err);
      alert(err.response?.data?.message || "Failed to apply for course.");
    } finally {
      setApplyingId(null);
    }
  };

  // Filtered List
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.skills || []).some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDomain =
      selectedDomain === "All" || course.domain === selectedDomain;
    const matchesLevel =
      selectedLevel === "All" ||
      course.level?.toLowerCase() === selectedLevel.toLowerCase();

    return matchesSearch && matchesDomain && matchesLevel;
  });

  const domainList = ["All", ...new Set(courses.map((c) => c.domain).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-indigo-900 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold text-amber-300 uppercase tracking-wider border border-white/20">
              ✨ CareerConnect Learning Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Recommended & Popular Courses
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Enhance your skills with industry-aligned courses tailored for Geeta University students.
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by skill, title, technology..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a]"
            >
              {domainList.map((d) => (
                <option key={d} value={d}>
                  Domain: {d}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a]"
            >
              <option value="All">Level: All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600">
              Matching recommended courses for your profile...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Course Cards Grid */}
        {!loading && filteredCourses.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
            <BookOpen size={36} className="mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">No courses match your search</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search keywords or domain filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isApplied = appliedCourseIds.has(course._id);
              const isApplying = applyingId === course._id;

              return (
                <div
                  key={course._id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                >
                  {/* Thumbnail / Header */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-4 flex flex-col justify-between text-white">
                        <BookOpen size={24} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {course.domain || "Course"}
                          </p>
                          <p className="text-xs font-bold line-clamp-1">{course.title}</p>
                        </div>
                      </div>
                    )}

                    {/* Recommendation Badge */}
                    {course.recommendation && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                        <Sparkles size={12} /> {course.recommendation}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="text-[#1e3a8a] font-bold">{course.category}</span>
                        <span className="capitalize">{course.level || "Beginner"}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Matched Skills */}
                    {course.matchedSkills && course.matchedSkills.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-[10px] font-bold text-slate-400">Matches:</span>
                        {course.matchedSkills.slice(0, 3).map((sk, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200/60"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Stats & Apply CTA */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {course.price > 0 ? `₹${course.price}` : "Free"}
                      </span>

                      <div className="flex items-center gap-2">
                        {onViewDetails && (
                          <button
                            type="button"
                            onClick={() => onViewDetails(course._id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                          >
                            Details
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleApply(course._id)}
                          disabled={isApplied || isApplying}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isApplied
                              ? "bg-emerald-100 text-emerald-800 cursor-default"
                              : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs"
                          }`}
                        >
                          {isApplied ? "Enrolled ✓" : isApplying ? "Applying..." : "Enroll"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCoursesPage;
