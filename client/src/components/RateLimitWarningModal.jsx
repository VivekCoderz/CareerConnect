import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, X, Clock } from "lucide-react";

/**
 * RateLimitWarningModal
 * Listens to global "rate_limit_alert" window events dispatched by the Axios interceptor
 * and displays an unmissable warning or 24-hour block alert to the user.
 */
const RateLimitWarningModal = () => {
  const [alertData, setAlertData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const handleRateLimitAlert = (event) => {
      const data = event.detail;
      setAlertData(data);
      if (data?.retryAfterSeconds) {
        setSecondsLeft(data.retryAfterSeconds);
      } else if (data?.retryAfterHours) {
        setSecondsLeft(data.retryAfterHours * 3600);
      } else {
        setSecondsLeft(60);
      }
    };

    window.addEventListener("rate_limit_alert", handleRateLimitAlert);
    return () => {
      window.removeEventListener("rate_limit_alert", handleRateLimitAlert);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!alertData || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alertData, secondsLeft]);

  if (!alertData) return null;

  const isBlocked24h =
    alertData.code === "TEMPORARILY_BLOCKED_24H" ||
    alertData.code === "IP_BLOCKED" ||
    alertData.isBlocked24h;

  const formatCountdown = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${s}s`;
    }
    return `${mins}m ${s < 10 ? "0" : ""}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-md rounded-2xl p-6 text-slate-800 shadow-2xl border ${
          isBlocked24h
            ? "bg-gradient-to-b from-red-50 to-white border-red-300"
            : "bg-gradient-to-b from-amber-50 to-white border-amber-300"
        } transition-all transform scale-100`}
      >
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isBlocked24h
                  ? "bg-red-500 text-white shadow-lg shadow-red-200"
                  : "bg-amber-500 text-white shadow-lg shadow-amber-200 animate-pulse"
              }`}
            >
              {isBlocked24h ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3
                className={`text-lg font-bold ${
                  isBlocked24h ? "text-red-700" : "text-amber-800"
                }`}
              >
                {isBlocked24h
                  ? "⛔ 24-Hour Access Blocked"
                  : "⚠️ Rate Limit Warning"}
              </h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isBlocked24h
                  ? "DoS Protection Triggered"
                  : "Anti-DoS Shield Active"}
              </p>
            </div>
          </div>

          {!isBlocked24h && (
            <button
              onClick={() => setAlertData(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Warning / Block Message */}
        <div
          className={`p-3.5 rounded-xl text-sm font-medium mb-4 leading-relaxed ${
            isBlocked24h
              ? "bg-red-100/70 border border-red-200 text-red-900"
              : "bg-amber-100/70 border border-amber-200 text-amber-900"
          }`}
        >
          {alertData.message ||
            (isBlocked24h
              ? "Excessive requests ke chalte aapko 24 ghante ke liye temporarily block kar diya gaya hai."
              : "Bohot zyada requests detect hui hain! Kripya request bhejna rokein, warna 24 ghante ke liye block kar diya jayega.")}
        </div>

        {/* Protection Explainer Box */}
        <div className="bg-white/80 rounded-xl p-3 border border-slate-200/80 mb-4 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span>Limit Policy:</span>
            <span className="text-[#1e3a8a]">15 requests / minute</span>
          </div>
          <p>
            {isBlocked24h
              ? "Aapka IP address 24 ghante ke liye temporarily restrict ho gaya hai taki server aur baki users DoS attack se safe rahein."
              : "Agar aapne agle 1 minute ke andar dobara continuous requests bheji, to aapka IP address turant 24 hours ke liye freeze ho jayega."}
          </p>
        </div>

        {/* Countdown Timer */}
        {secondsLeft > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100/90 rounded-lg text-slate-700 font-mono text-sm mb-4">
            <Clock className="w-4 h-4 text-slate-500 animate-spin" />
            <span>Cooldown:</span>
            <span className="font-bold text-slate-900">
              {formatCountdown(secondsLeft)}
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          {isBlocked24h ? (
            <div className="w-full text-center py-2.5 px-4 bg-red-600/10 text-red-800 rounded-xl font-semibold text-sm border border-red-200">
              Please try again after 24 hours
            </div>
          ) : (
            <button
              onClick={() => setAlertData(null)}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all shadow-amber-200"
            >
              Main Samajh Gaya (Understood)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateLimitWarningModal;
