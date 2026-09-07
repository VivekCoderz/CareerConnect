import React, { useState } from "react";
import OfferLetterPreviewModal from "../employer/OfferLetterPreviewModal";
import recruitmentService from "../../services/recruitmentService";

const CandidateOfferResponseModal = ({
  isOpen,
  onClose,
  offer,
  onOfferResponded,
}) => {
  const [showFullLetter, setShowFullLetter] = useState(false);
  const [responseAction, setResponseAction] = useState("accept"); // "accept" | "reject"
  const [signature, setSignature] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [notes, setNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("Accepted another offer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !offer) return null;

  const candidateName = offer.candidateId?.fullName || "Candidate";
  const salary = offer.salary ? `₹${offer.salary.toLocaleString()} ${offer.salaryPeriod || "Per Annum"}` : "Competitive";
  const joiningDate = offer.joiningDate ? new Date(offer.joiningDate).toLocaleDateString("en-IN") : "Immediate";
  const expiryDate = offer.expiryDate ? new Date(offer.expiryDate).toLocaleDateString("en-IN") : "Shortly";

  const isResponded = ["Accepted", "Rejected"].includes(offer.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (responseAction === "accept") {
      if (!signature.trim()) {
        setError("Please type your full legal name as your digital signature.");
        return;
      }
      if (!termsAgreed) {
        setError("You must agree to the employment terms & conditions to proceed.");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        status: responseAction === "accept" ? "Accepted" : "Rejected",
        candidateSignature: signature,
        candidateResponseNotes: notes,
        declineReason: responseAction === "reject" ? declineReason : undefined,
      };

      await recruitmentService.respondToOffer(offer._id, payload);
      if (onOfferResponded) onOfferResponded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center text-lg font-black">
                🎉
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Job Offer Review</h3>
                <p className="text-xs text-slate-500">From {offer.employerId?.companyName || "Employer"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Offer Highlight Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900">{offer.designation}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                  {offer.employmentType || "Full-time"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Offered CTC</span>
                  <span className="font-bold text-slate-900">{salary}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Work Location</span>
                  <span className="font-bold text-slate-900">{offer.location || "Hybrid"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Expected Joining</span>
                  <span className="font-bold text-blue-900">{joiningDate}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Offer Validity Deadline</span>
                  <span className="font-bold text-red-700">{expiryDate}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFullLetter(true)}
                className="w-full mt-2 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>📄</span>
                <span>Open Full Official Offer Letterhead</span>
              </button>
            </div>

            {/* If already responded */}
            {isResponded ? (
              <div className={`p-4 rounded-2xl text-center border font-bold text-xs ${
                offer.status === "Accepted"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}>
                You have already {offer.status.toLowerCase()} this offer on {offer.respondedAt ? new Date(offer.respondedAt).toLocaleDateString() : "earlier"}.
              </div>
            ) : (
              /* Response Form */
              <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
                {/* Decision Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Select Your Decision</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setResponseAction("accept")}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        responseAction === "accept"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>✓</span> Accept Offer
                    </button>

                    <button
                      type="button"
                      onClick={() => setResponseAction("reject")}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        responseAction === "reject"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>✕</span> Decline Offer
                    </button>
                  </div>
                </div>

                {responseAction === "accept" ? (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Digital Signature (Type your full legal name) *
                      </label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder={candidateName}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Message / Note to Hiring Manager (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="I am thrilled to accept this offer and look forward to joining..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-emerald-500"
                      />
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-600 leading-snug">
                        I agree to the employment terms, joining date commitments, and company policies as outlined in the official offer letter.
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Declining</label>
                      <select
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-rose-500"
                      >
                        <option value="Accepted another offer">Accepted another offer</option>
                        <option value="Compensation below expectations">Compensation below expectations</option>
                        <option value="Location / commute constraints">Location / commute constraints</option>
                        <option value="Pursuing higher education / research">Pursuing higher education / research</option>
                        <option value="Personal / Family reasons">Personal / Family reasons</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Feedback / Remarks (Optional)</label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Thank you for considering me for this opportunity..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition ${
                      responseAction === "accept"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {submitting
                      ? "Submitting..."
                      : responseAction === "accept"
                      ? "Confirm & Accept Offer"
                      : "Submit Decision"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Full Letter Modal */}
      <OfferLetterPreviewModal
        isOpen={showFullLetter}
        onClose={() => setShowFullLetter(false)}
        offer={offer}
        companyName={offer.employerId?.companyName || "CareerConnect Partner"}
      />
    </>
  );
};

export default CandidateOfferResponseModal;
