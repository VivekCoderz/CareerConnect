import { Link } from "react-router-dom";

const CertificationsCard = ({ certifications = [] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Verified Certifications</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {certifications.length} Credentials
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Professional industry certifications & verified competencies</p>
        </div>

        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          + Add Credential
        </Link>
      </div>

      {certifications && certifications.length > 0 ? (
        <div className="space-y-3">
          {certifications.map((cert, idx) => (
            <div
              key={cert._id || idx}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                  📜
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{cert.name}</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{cert.issuingOrganization}</p>
                  {cert.credentialId && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      ID: {cert.credentialId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Verify ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium mb-1">No certifications attached yet.</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Upload AWS, Google Cloud, Meta, or Coursera credentials to validate your skills.
          </p>
          <Link
            to="/student/profile"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
          >
            + Add Certification
          </Link>
        </div>
      )}
    </div>
  );
};

export default CertificationsCard;
