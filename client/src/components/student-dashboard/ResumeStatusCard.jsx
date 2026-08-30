import { Link } from "react-router-dom";

const ResumeStatusCard = ({ resume, profile }) => {
  const hasResume = !!(resume?.resumeName || resume?.resumeUrl);
  const resumeName = resume?.resumeName || "Student_Professional_Resume.pdf";
  const uploadedDate = resume?.uploadedAt
    ? new Date(resume.uploadedAt).toLocaleDateString()
    : "Recently synced";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Resume & CV Status</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated ATS-friendly resume generated from your verified profile</p>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            hasResume
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {hasResume ? "✓ Ready" : "○ Not Created"}
        </span>
      </div>

      {hasResume ? (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
              📄
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">{resumeName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">ATS Optimized • Synced on {uploadedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/student/profile"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Update Resume
            </Link>
            <button
              onClick={() => alert("Downloading your profile resume as PDF...")}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
            >
              Download PDF
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium mb-1">You haven't created or uploaded a resume yet.</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Build your resume in 1-click using your education, skills, and project data.
          </p>
          <Link
            to="/resume-builder"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            Build Resume Now →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ResumeStatusCard;
