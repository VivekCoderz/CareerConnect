import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const emptyCertification = {
  name: "",
  issuingOrganization: "",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  credentialUrl: "",
  certificateUrl: "",
};

const CertificationsSection = ({
  certifications = [],
  setProfile,
}) => {
  const [form, setForm] = useState(emptyCertification);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = editingId
        ? certifications.map((item) =>
            item._id === editingId ? { ...form, _id: editingId } : item
          )
        : [...certifications, form];

      const response = await updateStudentProfile({
        certifications: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      setForm(emptyCertification);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert("Failed to save certification");
    } finally {
      setSaving(false);
    }
  };

  const editCertification = (item) => {
    setForm({
      name: item.name || "",
      issuingOrganization: item.issuingOrganization || "",
      issueDate: item.issueDate ? item.issueDate.substring(0, 10) : "",
      expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : "",
      credentialId: item.credentialId || "",
      credentialUrl: item.credentialUrl || "",
      certificateUrl: item.certificateUrl || "",
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  const deleteCertification = async (id) => {
    if (!window.confirm("Delete this certification?")) return;

    try {
      const updated = certifications.filter((item) => item._id !== id);
      const response = await updateStudentProfile({
        certifications: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert("Failed to delete certification");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Certifications & Badges</h2>
          <p className="text-xs text-slate-500 mt-0.5">Professional credentials, online courses, and licenses</p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyCertification);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            + Add Certification
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? "Edit Certification" : "Add Certification"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certification Name *</label>
              <input
                name="name"
                placeholder="e.g. AWS Certified Cloud Practitioner"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issuing Organization *</label>
              <input
                name="issuingOrganization"
                placeholder="e.g. Amazon Web Services, Coursera"
                value={form.issuingOrganization}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                name="issueDate"
                value={form.issueDate}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credential ID</label>
              <input
                name="credentialId"
                placeholder="e.g. AWS-123456"
                value={form.credentialId}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credential URL</label>
              <input
                name="credentialUrl"
                placeholder="https://..."
                value={form.credentialUrl}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {saving ? "Saving..." : "Save Certification"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {certifications && certifications.length > 0 ? (
          certifications.map((item) => (
            <div
              key={item._id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{item.issuingOrganization}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                  {item.issueDate && (
                    <span>Issued: {new Date(item.issueDate).toLocaleDateString()}</span>
                  )}
                  {item.credentialId && (
                    <span className="font-mono text-[11px] text-slate-400">ID: {item.credentialId}</span>
                  )}
                  {item.credentialUrl && (
                    <a
                      href={item.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      Verify Credential ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => editCertification(item)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCertification(item._id)}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 text-xs font-semibold rounded-xl transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          !showForm && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500">No certifications added yet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default CertificationsSection;