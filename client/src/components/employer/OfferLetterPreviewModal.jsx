import React, { useRef } from "react";

const OfferLetterPreviewModal = ({ isOpen, onClose, offer, companyName = "CareerConnect Partner Organization" }) => {
  const printRef = useRef(null);

  if (!isOpen || !offer) return null;

  const candidateName = offer.candidateId?.fullName || "Valued Candidate";
  const candidateEmail = offer.candidateId?.email || "candidate@careerconnect.edu";
  const designation = offer.designation || "Software Engineer";
  const department = offer.department || "Engineering";
  const employmentType = offer.employmentType || "Full-time";
  const workLocationType = offer.workLocationType || "Hybrid";
  const location = offer.location || "Gurugram / Geeta University Campus";
  const reportingManager = offer.reportingManager || "Head of Department";
  const probationPeriod = offer.probationPeriod || "3 Months";
  const noticePeriod = offer.noticePeriod || "30 Days";
  const salary = offer.salary || 0;
  const baseSalary = offer.baseSalary || Math.round(salary * 0.7);
  const allowances = offer.allowances || Math.round(salary * 0.2);
  const variableBonus = offer.variableBonus || Math.round(salary * 0.1);
  const salaryPeriod = offer.salaryPeriod || "Per Annum (LPA)";
  const currency = offer.currency || "INR (₹)";
  const joiningDate = offer.joiningDate
    ? new Date(offer.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Immediate";
  const expiryDate = offer.expiryDate
    ? new Date(offer.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Within 5 Business Days";
  const refNo = offer.offerLetterRefNo || `OFF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateIssued = offer.createdAt
    ? new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const signatoryName = offer.signatoryName || "Dr. Rajesh Verma";
  const signatoryTitle = offer.signatoryTitle || "Head of Talent Acquisition & Campus Partnerships";
  const signatoryOrg = offer.signatoryOrganization || "Geeta University Placement & Career Center";

  const benefitsList = Array.isArray(offer.benefits) && offer.benefits.length > 0
    ? offer.benefits
    : [
        "Comprehensive Medical & Family Health Insurance Coverage",
        "Annual Performance Incentive & Retention Bonus",
        "Professional Learning & Certification Allowance",
        "Modern Computing Hardware & Hybrid Work Setup",
        "Generous Paid Time Off & Official University Holidays",
      ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-in-top">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-black text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Official Job Offer Letter</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                  {offer.status || "Sent"}
                </span>
              </div>
              <p className="text-xs text-slate-500">Ref: {refNo} • For {candidateName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
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

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100/50 flex justify-center">
          <div
            ref={printRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-3xl w-full p-8 sm:p-12 text-slate-800 space-y-6 text-xs sm:text-[13px] leading-relaxed relative print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Watermark Branding */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
              <span className="text-7xl sm:text-9xl font-black uppercase tracking-widest text-slate-900 transform -rotate-12">
                CAREERCONNECT
              </span>
            </div>

            {/* Letterhead Header */}
            <div className="border-b-2 border-slate-900/80 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[11px] font-extrabold tracking-widest text-amber-600 uppercase block">
                  GEETA UNIVERSITY
                </span>
                <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight">
                  CAREERCONNECT
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Center for Corporate Partnerships & Talent Placements
                </p>
              </div>

              <div className="text-left sm:text-right space-y-0.5">
                <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Formal Employment Letter</p>
                <p className="text-[11px] text-slate-600 font-mono">Ref: <span className="font-bold text-slate-800">{refNo}</span></p>
                <p className="text-[11px] text-slate-500">Date: {dateIssued}</p>
              </div>
            </div>

            {/* Candidate Salutation & Intro */}
            <div className="space-y-3">
              <div>
                <p className="font-bold text-slate-900 text-sm">To,</p>
                <p className="font-extrabold text-slate-900 text-sm">{candidateName}</p>
                <p className="text-slate-600">{candidateEmail}</p>
              </div>

              <p className="font-bold text-slate-900 pt-2">
                Subject: Official Letter of Employment for the position of <span className="text-amber-700 underline underline-offset-2">{designation}</span>
              </p>

              <p className="text-slate-700">
                Dear <strong className="text-slate-900">{candidateName}</strong>,
              </p>

              <p className="text-slate-700 text-justify">
                On behalf of <strong className="text-slate-900">{companyName}</strong> and the placement governing board at CareerConnect, Geeta University, we are exceptionally delighted to extend this formal offer of employment to you. We were thoroughly impressed by your academic record, technical competencies, and interview performance, and we are confident that you will make significant contributions to our team.
              </p>
            </div>

            {/* Role & Placement Details Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5">
                1. Position & Appointment Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 pt-1">
                <div>
                  <span className="text-[11px] text-slate-500 block">Designation / Role:</span>
                  <span className="font-bold text-slate-900">{designation}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Department:</span>
                  <span className="font-bold text-slate-900">{department}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Employment Type:</span>
                  <span className="font-bold text-slate-900">{employmentType}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Work Mode:</span>
                  <span className="font-bold text-slate-900">{workLocationType}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Work Location:</span>
                  <span className="font-bold text-slate-900">{location}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Reporting To:</span>
                  <span className="font-bold text-slate-900">{reportingManager}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Expected Joining Date:</span>
                  <span className="font-bold text-blue-900">{joiningDate}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Probation Period:</span>
                  <span className="font-bold text-slate-900">{probationPeriod}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Notice Period:</span>
                  <span className="font-bold text-slate-900">{noticePeriod}</span>
                </div>
              </div>
            </div>

            {/* Compensation & Structure Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-700">
                2. Compensation & Benefits Structure
              </h4>
              <p className="text-slate-600 text-[12px]">
                Your total compensation package will be <strong className="text-slate-900">₹{salary.toLocaleString()} {salaryPeriod}</strong>, structured as outlined below:
              </p>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[11.5px] font-bold text-slate-700">
                      <th className="py-2 px-3">Salary Component</th>
                      <th className="py-2 px-3">Structure / Description</th>
                      <th className="py-2 px-3 text-right">Annual Value ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px]">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">Basic Salary</td>
                      <td className="py-2 px-3 text-slate-600">Fixed Monthly Base Pay</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{baseSalary.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-800">HRA & Special Allowances</td>
                      <td className="py-2 px-3 text-slate-600">House rent, commute, and utilities</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{allowances.toLocaleString()}</td>
                    </tr>
                    {variableBonus > 0 && (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-800">Variable Performance Bonus</td>
                        <td className="py-2 px-3 text-slate-600">Annual appraisal & milestone linked</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">₹{variableBonus.toLocaleString()}</td>
                      </tr>
                    )}
                    {offer.stockOptions && (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-800">Stock Options / ESOPs</td>
                        <td className="py-2 px-3 text-slate-600">{offer.stockOptions}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-700">Vested</td>
                      </tr>
                    )}
                    <tr className="bg-amber-50/60 font-bold border-t-2 border-slate-300">
                      <td className="py-2.5 px-3 text-slate-900" colSpan={2}>Total Cost to Company (CTC)</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-900">₹{salary.toLocaleString()} {salaryPeriod}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-700">
                3. Perks & Benefits Included
              </h4>
              <ul className="grid sm:grid-cols-2 gap-1.5 list-disc pl-4 text-slate-600 text-[12px]">
                {benefitsList.map((benefit, idx) => (
                  <li key={idx} className="leading-snug">
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Terms and Acceptance Timeline */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-700">
                4. Terms of Employment & Response Deadline
              </h4>
              <p className="text-slate-600 text-justify text-[12px]">
                {offer.additionalTerms ||
                  "This offer is contingent upon successful verification of your educational transcripts, background checks, and identity verification. By accepting this offer, you confirm your adherence to company non-disclosure agreements, IP ownership clauses, and code of conduct."}
              </p>
              <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-red-800 text-[12px]">
                <strong>Important:</strong> This offer is valid until <span className="font-bold underline">{expiryDate}</span>. Kindly confirm your acceptance digitally via your CareerConnect portal prior to this deadline.
              </div>
            </div>

            {/* Signatures Area */}
            <div className="pt-8 border-t-2 border-slate-900/80 grid grid-cols-2 gap-8 items-end">
              {/* Employer Signatory */}
              <div className="space-y-2">
                <div className="font-script text-lg text-slate-900 tracking-wide font-bold italic border-b border-slate-300 pb-1">
                  {signatoryName}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{signatoryName}</p>
                  <p className="text-[11px] text-slate-600">{signatoryTitle}</p>
                  <p className="text-[10px] text-slate-500">{signatoryOrg}</p>
                </div>
              </div>

              {/* Candidate Acceptance */}
              <div className="space-y-2 text-right">
                <div className="border-b border-slate-300 pb-1 min-h-[28px] flex items-end justify-end">
                  {offer.candidateSignature ? (
                    <span className="font-script text-base text-green-700 font-bold italic">
                      ✓ {offer.candidateSignature}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pending Digital Signature</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{candidateName}</p>
                  <p className="text-[11px] text-slate-600">Candidate Acceptance</p>
                  <p className="text-[10px] text-slate-500">
                    {offer.respondedAt ? `Signed on: ${new Date(offer.respondedAt).toLocaleDateString()}` : "Awaiting signature"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            Offer Status: <strong className="text-slate-800">{offer.status}</strong> • Created: {dateIssued}
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

export default OfferLetterPreviewModal;
