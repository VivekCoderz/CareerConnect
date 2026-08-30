import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getById } from "../../services/internshipService";
import { applyToInternship } from "../../services/applicationService";

export default function InternshipDetail({ id, onBack }) {
  const { id: paramId } = useParams();
  const internshipId = id || paramId;
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Application fields
  const [coverNote, setCoverNote] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getById(internshipId);
        if (res.success) {
          setInternship(res.internship);
        } else {
          setError(res.message || "Failed to load internship details");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load internship details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [internshipId]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setApplying(true);
      setError("");
      setSuccessMsg("");

      const res = await applyToInternship(internshipId, {
        coverNote,
        resumeUrl,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Application submitted successfully!");
        setCoverNote("");
        setResumeUrl("");
      } else {
        setError(res.message || "Failed to submit application");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error submitting application. You may have already applied.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1e3a8a]"></div>
      </div>
    );
  }

  if (error && !internship) {
    return (
      <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
            >
              Back to Internships
            </button>
          ) : (
            <Link
              to="/internships"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
            >
              Back to Internships
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!internship) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="max-w-4xl mx-auto mb-6">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm font-bold text-[#1e3a8a] hover:text-[#1e40af] transition-colors"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </button>
        ) : (
          <Link
            to="/internships"
            className="inline-flex items-center text-sm font-bold text-[#1e3a8a] hover:text-[#1e40af] transition-colors"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details (Col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Header info */}
            <div className="border-b border-slate-100 pb-6 mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    internship.isExternal
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  {internship.isExternal ? "External Listing" : "Campus Exclusive"}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {internship.workMode}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {internship.title}
              </h1>
              <p className="text-lg font-semibold text-[#1e3a8a] mt-1">
                {internship.companyName}
              </p>
              <p className="text-sm text-slate-500 mt-2 flex items-center">
                <svg className="h-4 w-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {internship.location}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Role Description</h3>
                <p className="whitespace-pre-line">{internship.description}</p>
              </div>

              {/* Responsibilities */}
              {internship.responsibilities && internship.responsibilities.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Key Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-1.5 pl-2">
                    {internship.responsibilities.map((resp, index) => (
                      <li key={index}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Skills */}
              {internship.requiredSkills && internship.requiredSkills.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {internship.requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Apply Form (Col-span 1) */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              Internship Overview
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider">Stipend</p>
                <p className="font-semibold text-sm text-slate-800 mt-0.5">
                  {internship.stipend || "Not disclosed"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                <p className="font-semibold text-sm text-slate-800 mt-0.5">
                  {internship.duration || "N/A"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider">Eligibility</p>
                <p className="font-semibold text-sm text-slate-800 mt-0.5">
                  {internship.eligibility || "Any graduate / Student"}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider">Application Deadline</p>
                <p className="font-semibold text-sm text-slate-800 mt-0.5">
                  {internship.deadline ? new Date(internship.deadline).toLocaleDateString() : "Open"}
                </p>
              </div>
              {internship.applicantsCount !== undefined && (
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider">Total Applicants</p>
                  <p className="font-semibold text-sm text-slate-800 mt-0.5">
                    {internship.applicantsCount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action / Apply Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            {successMsg && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-200 mb-4 text-center">
                <div className="text-sm font-bold text-green-800">{successMsg}</div>
                <Link to="/applications" className="text-xs font-bold text-[#1e3a8a] mt-2 block hover:underline">
                  View My Applications
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-200 mb-4">
                <div className="text-xs font-medium text-red-800">{error}</div>
              </div>
            )}

            {internship.isExternal ? (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  This opportunity is hosted externally on another platform or company board.
                </p>
                <a
                  href={internship.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors text-center shadow-sm"
                >
                  Apply on Company Site
                  <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              // Direct Campus application form
              <div>
                {successMsg ? null : (
                  <form onSubmit={handleApply} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Apply via Geeta University</h4>
                    
                    {/* Resume URL */}
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Resume Link
                      </label>
                      <input
                        type="url"
                        placeholder="Google Drive, Dropbox, or Portfolio URL"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        required
                        className="h-11 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 text-sm text-slate-800"
                      />
                    </div>

                    {/* Cover Note */}
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Cover Note (Optional)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Why do you think you are a good fit for this role?"
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        className="p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 text-sm text-slate-800 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={applying}
                      className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors shadow-sm disabled:opacity-50"
                    >
                      {applying ? "Submitting..." : "Submit Application"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
