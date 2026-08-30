import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getById, update } from "../../services/internshipService";

export default function EditInternship({ id, onCancel, onSuccess }) {
  const { id: paramId } = useParams();
  const internshipId = id || paramId;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [title, setTitle] = useState("");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [location, setLocation] = useState("");
  const [stipend, setStipend] = useState("");
  const [duration, setDuration] = useState("");
  const [openings, setOpenings] = useState(1);
  const [eligibility, setEligibility] = useState("");
  const [education, setEducation] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("Published");

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getById(internshipId);
        if (res.success && res.internship) {
          const item = res.internship;
          setTitle(item.title || "");
          setWorkMode(item.workMode || "Hybrid");
          setLocation(item.location || "");
          setStipend(item.stipend || "");
          setDuration(item.duration || "");
          setOpenings(item.openings || 1);
          setEligibility(item.eligibility || "");
          setEducation(item.education || "");
          setDescription(item.description || "");
          setStatus(item.status || "Published");
          
          if (item.deadline) {
            // format to YYYY-MM-DD
            setDeadline(new Date(item.deadline).toISOString().split("T")[0]);
          } else {
            setDeadline("");
          }

          if (item.requiredSkills) {
            setSkillsText(item.requiredSkills.join(", "));
          }
          if (item.responsibilities) {
            setResponsibilitiesText(item.responsibilities.join("\n"));
          }
        } else {
          setError(res.message || "Failed to load internship data");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load internship details.");
      } finally {
        setLoading(false);
      }
    };

    fetchInternship();
  }, [internshipId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const requiredSkills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const responsibilities = responsibilitiesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        title,
        workMode,
        location,
        stipend,
        duration,
        openings: Number(openings),
        eligibility,
        education,
        description,
        responsibilities,
        requiredSkills,
        deadline: deadline || null,
        status,
      };

      const res = await update(internshipId, payload);
      if (res.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/employer/internships");
        }
      } else {
        setError(res.message || "Failed to update internship");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save updates. Ensure all required fields are valid.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f59e0b]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
              GEETA UNIVERSITY
            </h1>
            <h2 className="text-2xl font-extrabold text-[#f59e0b] tracking-tight">
              Employer Hub &bull; CareerConnect
            </h2>
          </div>
          <Link
            to="/employer/internships"
            className="mt-2 sm:mt-0 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Back to Postings
          </Link>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-800">Edit Internship Listing</h3>
          <p className="text-sm text-slate-500 mt-1">
            Modify the details below and save changes to update the listing on the student board.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200 mb-6">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Title & Work Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Internship Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Frontend React Intern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Work Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                required
                className="h-11 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800 bg-white"
              >
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          {/* Row 2: Location & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore, Karnataka or Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 3 months or 6 months"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Row 3: Stipend & Openings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Stipend Details <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ₹20,000/month or Unpaid"
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                required
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Number of Openings
              </label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={openings}
                onChange={(e) => setOpenings(e.target.value)}
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Row 4: Eligibility & Education */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Eligibility Criteria
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech CS 3rd/4th year students"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Required Education
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech / MCA / BCA"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
              />
            </div>
          </div>

          {/* Row 5: Deadline & Listing Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Application Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Listing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800 bg-white"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Role Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Provide a comprehensive description of the internship role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
            />
          </div>

          {/* Key Responsibilities */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Key Responsibilities (One per line)
            </label>
            <textarea
              rows={4}
              placeholder="Responsibilities..."
              value={responsibilitiesText}
              onChange={(e) => setResponsibilitiesText(e.target.value)}
              className="p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
            />
          </div>

          {/* Required Skills */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Required Skills (Separated by commas)
            </label>
            <input
              type="text"
              placeholder="e.g. React, JavaScript, Tailwind"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 text-sm text-slate-800"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
            ) : (
              <Link
                to="/employer/internships"
                className="inline-flex items-center px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </Link>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-[#f59e0b] hover:bg-[#d97706] transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
