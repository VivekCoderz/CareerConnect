import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const ResumeSection = ({
  resume,
  setProfile,
}) => {
  const [url, setUrl] = useState(
    resume?.resumeUrl || ""
  );

  const [name, setName] = useState(
    resume?.resumeName || ""
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await updateStudentProfile({
        resume: {
          resumeUrl: url,
          resumeName: name || "Student_Professional_Resume.pdf",
          uploadedAt: new Date(),
        },
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      alert("Resume saved successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Resume & CV Links</h2>
        <p className="text-xs text-slate-500 mt-0.5">Attach your hosted resume link (Google Drive, LinkedIn, or Cloud Storage)</p>
      </div>

      {resume?.resumeUrl ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              📄
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate">{resume.resumeName || "My Resume.pdf"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Uploaded/Synced {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : "recently"}
              </p>
            </div>
          </div>

          <a
            href={resume.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-center"
          >
            View Live Resume ↗
          </a>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">You haven't attached a live resume link yet.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resume Name / Title</label>
            <input
              type="text"
              placeholder="e.g. John_Doe_FullStack_Resume.pdf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resume URL (Drive / Cloud Link)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            {saving ? "Saving..." : "Save Resume Information"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ResumeSection;