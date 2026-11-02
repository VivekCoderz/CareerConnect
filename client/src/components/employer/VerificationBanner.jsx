// Tells an employer why posting is disabled until the platform verifies their company.
export default function VerificationBanner({ status, rejectionReason }) {
  if (!status || status === "approved") return null;

  const rejected = status === "rejected";
  return (
    <div
      role="status"
      className={`p-4 rounded-2xl border text-xs ${
        rejected ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-900"
      }`}
    >
      <p className="font-bold">
        {rejected ? "Your company verification was not approved" : "Your company is awaiting verification"}
      </p>
      <p className="mt-0.5">
        {rejected
          ? rejectionReason || "Please contact support to review your company details."
          : "You can set up your profile and team now. Posting jobs and internships unlocks once our team verifies your company."}
      </p>
    </div>
  );
}
