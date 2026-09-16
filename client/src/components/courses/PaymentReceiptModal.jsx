import React from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Download,
  ArrowRight,
  X,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

/**
 * PaymentReceiptModal
 * Shows clean transaction confirmation & receipt after successful Razorpay checkout.
 */
const PaymentReceiptModal = ({ isOpen, onClose, receiptData, onStartLearning }) => {
  if (!isOpen || !receiptData) return null;

  const {
    paymentId,
    orderId,
    amount,
    courseTitle,
    courseId,
    paidAt = new Date(),
    isFree = false,
  } = receiptData;

  const formattedDate = new Date(paidAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
            <CheckCircle2 size={36} className="text-white" />
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-1">
            <ShieldCheck size={14} />
            {isFree ? "Enrollment Confirmed" : "Payment Verified"}
          </span>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            {isFree ? "Free Course Unlocked!" : "Payment Successful!"}
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-sm mx-auto">
            You have received instant lifetime access to the curriculum, lessons, and certification.
          </p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-5 flex-1">
          {/* Amount Badge */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Amount
              </p>
              <p className="text-2xl font-black text-slate-900">
                {isFree || amount === 0 ? "₹0 (Free)" : `₹${amount}`}
              </p>
            </div>

            <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Status: Successful
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Course:</span>
              <span className="font-bold text-slate-900 text-right max-w-[260px] truncate">
                {courseTitle || "Course Curriculum"}
              </span>
            </div>

            {paymentId && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Razorpay Payment ID:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  {paymentId}
                </span>
              </div>
            )}

            {orderId && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Razorpay Order ID:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  {orderId}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Transaction Date:</span>
              <span className="font-medium text-slate-700">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">Payment Gateway:</span>
              <span className="font-bold text-[#1e3a8a] flex items-center gap-1">
                <CreditCard size={14} /> Razorpay Secure Checkout
              </span>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11.5px] text-blue-900 leading-relaxed flex items-start gap-2">
            <Sparkles size={16} className="text-[#1e3a8a] flex-shrink-0 mt-0.5" />
            <span>
              A confirmation email and notification have been registered. You can always review this receipt in your orders history.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-600 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download size={14} /> Print Receipt
          </button>

          <button
            type="button"
            onClick={() => {
              if (onStartLearning) {
                onStartLearning(courseId);
              } else {
                onClose();
              }
            }}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Start Learning Now</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptModal;
