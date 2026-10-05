import { createPortal } from "react-dom";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Printing the modal cut the letter off at the modal's scroll height, so a second copy of
// the letter is rendered straight into <body> and is the only thing shown when printing.
const PRINT_CSS = `
.offer-letter-print { display: none; }
@media print {
  @page { margin: 14mm; }
  body > *:not(.offer-letter-print) { display: none !important; }
  .offer-letter-print { display: block !important; }
  .offer-letter-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .offer-letter-print section, .offer-letter-print table, .offer-letter-print .avoid-break { break-inside: avoid; }
}`;

/** The letter itself: only what the employer entered, on the employer's letterhead. */
const LetterBody = ({ offer, companyName }) => {
  const company = companyName || offer.employerId?.companyName || offer.signatoryOrganization || "";
  const candidateName = offer.candidateId?.fullName || "the candidate";
  const candidateEmail = offer.candidateId?.email || "";
  const designation = offer.designation || "";
  const salary = Number(offer.salary) || 0;
  const salaryPeriod = offer.salaryPeriod || "Per Annum";
  const refNo = offer.offerLetterRefNo || (offer._id ? `OFF-${String(offer._id).slice(-6).toUpperCase()}` : "");
  const dateIssued = formatDate(offer.createdAt || Date.now());
  const benefits = (Array.isArray(offer.benefits) ? offer.benefits : String(offer.benefits || "").split(","))
    .map((b) => String(b).trim())
    .filter(Boolean);
  const components = [
    ["Basic salary", offer.baseSalary],
    ["HRA and allowances", offer.allowances],
    ["Variable / performance bonus", offer.variableBonus],
  ].filter(([, value]) => Number(value) > 0);

  const details = [
    ["Designation", designation],
    ["Department", offer.department],
    ["Employment type", offer.employmentType],
    ["Work mode", offer.workLocationType],
    ["Work location", offer.location],
    ["Reporting to", offer.reportingManager],
    ["Joining date", formatDate(offer.joiningDate)],
    ["Probation period", offer.probationPeriod],
    ["Notice period", offer.noticePeriod],
  ].filter(([, value]) => value);

  return (
    <div className="bg-white text-slate-800 space-y-6 text-[13px] leading-relaxed">
      {/* Letterhead: the employer's company */}
      <div className="border-b-2 border-slate-900/80 pb-4 flex flex-wrap justify-between items-end gap-4 avoid-break">
        <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight wrap-break-word">{company || "Offer letter"}</h1>
        <div className="text-right space-y-0.5">
          <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Offer of employment</p>
          {refNo && <p className="text-[11px] text-slate-600 font-mono">Ref: <span className="font-bold text-slate-800">{refNo}</span></p>}
          <p className="text-[11px] text-slate-500">Date: {dateIssued}</p>
        </div>
      </div>

      <div className="space-y-3 avoid-break">
        <div>
          <p className="font-bold text-slate-900">To,</p>
          <p className="font-extrabold text-slate-900">{candidateName}</p>
          {candidateEmail && <p className="text-slate-600">{candidateEmail}</p>}
        </div>
        {designation && (
          <p className="font-bold text-slate-900">Subject: Offer of employment for the position of {designation}</p>
        )}
        <p>Dear <strong className="text-slate-900">{candidateName}</strong>,</p>
        <p className="text-justify">
          {company ? <>On behalf of <strong className="text-slate-900">{company}</strong>, we</> : "We"} are pleased to
          offer you {designation ? <>the position of <strong>{designation}</strong></> : "this position"} on the terms below.
        </p>
      </div>

      {details.length > 0 && (
        <section className="rounded-xl p-4 border border-slate-200 space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5">Position details</h4>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 pt-1">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {salary > 0 && (
        <section className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Compensation</h4>
          <p className="text-slate-600">
            Your total compensation will be <strong className="text-slate-900">{rupees(salary)} {salaryPeriod}</strong>
            {components.length > 0 ? ", made up as follows:" : "."}
          </p>
          {components.length > 0 && (
            <table className="w-full text-left border border-slate-200 border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="py-2 px-3">Component</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-2 px-3 font-semibold">{label}</td>
                    <td className="py-2 px-3 text-right font-mono">{rupees(value)}</td>
                  </tr>
                ))}
                {offer.stockOptions && (
                  <tr>
                    <td className="py-2 px-3 font-semibold">Stock options / ESOPs</td>
                    <td className="py-2 px-3 text-right">{offer.stockOptions}</td>
                  </tr>
                )}
                <tr className="font-bold border-t-2 border-slate-300">
                  <td className="py-2 px-3">Total (CTC)</td>
                  <td className="py-2 px-3 text-right font-mono">{rupees(salary)} {salaryPeriod}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>
      )}

      {benefits.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Benefits</h4>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[12px]">
            {benefits.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-2 pt-2 border-t border-slate-200">
        {offer.additionalTerms && (
          <>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Terms</h4>
            <p className="text-slate-600 text-justify text-[12px] whitespace-pre-line">{offer.additionalTerms}</p>
          </>
        )}
        {offer.expiryDate && (
          <p className="text-[12px] text-slate-700">
            Please respond to this offer by <strong>{formatDate(offer.expiryDate)}</strong>.
          </p>
        )}
      </section>

      <div className="pt-8 border-t-2 border-slate-900/80 grid grid-cols-2 gap-8 items-end avoid-break">
        <div className="space-y-1">
          <div className="border-b border-slate-300 min-h-7" />
          {offer.signatoryName && <p className="font-bold text-slate-900 text-xs">{offer.signatoryName}</p>}
          {offer.signatoryTitle && <p className="text-[11px] text-slate-600">{offer.signatoryTitle}</p>}
          {(offer.signatoryOrganization || company) && (
            <p className="text-[10px] text-slate-500">{offer.signatoryOrganization || company}</p>
          )}
        </div>
        <div className="space-y-1 text-right">
          <div className="border-b border-slate-300 pb-1 min-h-7 flex items-end justify-end">
            {offer.candidateSignature ? (
              <span className="text-base text-green-700 font-bold italic">✓ {offer.candidateSignature}</span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Awaiting acceptance</span>
            )}
          </div>
          <p className="font-bold text-slate-900 text-xs">{candidateName}</p>
          <p className="text-[11px] text-slate-600">Candidate acceptance</p>
          {offer.respondedAt && (
            <p className="text-[10px] text-slate-500">Signed on {formatDate(offer.respondedAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const OfferLetterPreviewModal = ({ isOpen, onClose, offer, companyName = "" }) => {
  if (!isOpen || !offer) return null;

  const candidateName = offer.candidateId?.fullName || "Candidate";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-in-top">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/90 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Offer letter</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                  {offer.status || "Draft"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">For {candidateName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-10 overflow-y-auto bg-slate-100/50 flex justify-center items-start">
            {/* items-start lets the letter grow to its full height so the modal scrolls instead of clipping it */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-3xl w-full p-6 sm:p-12">
              <LetterBody offer={offer} companyName={companyName} />
            </div>
          </div>
        </div>
      </div>
      {createPortal(
        <div className="offer-letter-print">
          <LetterBody offer={offer} companyName={companyName} />
        </div>,
        document.body
      )}
    </>
  );
};

export default OfferLetterPreviewModal;
