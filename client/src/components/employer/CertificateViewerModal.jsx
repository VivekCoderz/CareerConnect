import React, { useRef } from "react";

const CertificateViewerModal = ({
  isOpen,
  onClose,
  certificate,
  recipientName = "Verified Professional",
}) => {
  const printRef = useRef(null);

  if (!isOpen || !certificate) return null;

  const certId = certificate.certificateId || `GU-CERT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const title = certificate.title || certificate.courseId?.title || "Professional Competency Certificate";
  const domain = certificate.domain || certificate.courseId?.domain || "Engineering & Technology";
  const competencyLevel = certificate.competencyLevel || "Advanced Level";
  const issueDate = certificate.issueDate
    ? new Date(certificate.issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const expiryDate = certificate.expiryDate
    ? new Date(certificate.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Valid for 3 Years";

  const skillsList = certificate.skills && certificate.skills.length > 0
    ? certificate.skills
    : ["System Architecture", "State Management", "Performance Optimization", "Scalable Clean Code"];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-slide-in-top">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-black text-lg">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Verifiable Professional Certificate</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                  certificate.status === "Expiring Soon"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : certificate.status === "Expired"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                }`}>
                  {certificate.status || "Valid"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">Credential ID: {certId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Download PDF / Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100/60 flex justify-center">
          <div
            ref={printRef}
            className="bg-white rounded-3xl border-8 border-double border-amber-600/60 shadow-lg max-w-3xl w-full p-8 sm:p-12 text-slate-900 text-center space-y-6 relative overflow-hidden print:border-8 print:shadow-none print:p-8"
          >
            {/* Elegant Corner Ornaments */}
            <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-amber-500/10 pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-blue-600/10 pointer-events-none" />

            {/* Institution Brand */}
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold tracking-widest text-amber-700 uppercase block">
                GEETA UNIVERSITY
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#1e3a8a] tracking-tight uppercase">
                CAREERCONNECT PROFESSIONAL ACADEMY
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Accredited Center for Corporate Learning, Skill Validation & Competency Development
              </p>
            </div>

            {/* Certificate Header Banner */}
            <div className="pt-2">
              <h2 className="text-2xl sm:text-3xl font-serif italic text-slate-900 font-bold">
                Certificate of Professional Competency
              </h2>
              <div className="w-24 h-1 bg-amber-500 mx-auto mt-2 rounded-full" />
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                This is proudly conferred upon
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] font-serif">
                {recipientName}
              </h3>
              <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                for demonstrating verified industry competencies, rigorous assessment performance, and successfully completing the accredited program:
              </p>
            </div>

            {/* Program Title & Competency Level */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 max-w-lg mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">{title}</h4>
              <p className="text-xs text-amber-800 font-semibold">{domain} • {competencyLevel}</p>
            </div>

            {/* Validated Skills Badges */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Validated Industry Competencies
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Signatures & Seal Block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 items-end text-xs">
              {/* Placement & Academic Director */}
              <div className="text-left space-y-1">
                <div className="font-script text-base text-slate-900 italic font-bold border-b border-slate-300 pb-0.5">
                  Dr. Rajesh Verma
                </div>
                <p className="font-bold text-slate-900 text-[11px]">Dr. Rajesh Verma</p>
                <p className="text-[10px] text-slate-500">Director, Placement & Learning</p>
              </div>

              {/* Gold Verification Crest */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border-2 border-amber-500 shadow-sm flex items-center justify-center text-xl font-black text-amber-900">
                  🏅
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-500">{certId}</span>
              </div>

              {/* Industry Partnerships Lead */}
              <div className="text-right space-y-1">
                <div className="font-script text-base text-slate-900 italic font-bold border-b border-slate-300 pb-0.5">
                  Ananya Sharma
                </div>
                <p className="font-bold text-slate-900 text-[11px]">Ananya Sharma</p>
                <p className="text-[10px] text-slate-500">VP, Enterprise Partnerships</p>
              </div>
            </div>

            {/* Bottom Verification Footer */}
            <div className="pt-2 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-1">
              <span>Issued On: <strong className="text-slate-700">{issueDate}</strong></span>
              <span>Valid Until: <strong className="text-slate-700">{expiryDate}</strong></span>
              <span className="font-mono">Verify at: careerconnect.geetauniversity.edu.in/verify</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            Certificate Status: <strong className="text-emerald-700 font-bold">{certificate.status || "Valid"}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition"
            >
              Download PDF / Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewerModal;
