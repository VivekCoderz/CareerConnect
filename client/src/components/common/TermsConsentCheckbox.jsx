/**
 * "I agree to the Terms and Privacy Policy" checkbox required on every signup path (G05,
 * DPDP consent). Keep the submit button disabled until it is ticked, and send
 * { acceptedTerms: true, termsVersion: TERMS_VERSION } (from config/legal) with the request.
 */
export default function TermsConsentCheckbox({ id = "accept-terms", checked, onChange, className = "" }) {
  return (
    <label htmlFor={id} className={`flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#1e3a8a] cursor-pointer"
      />
      <span>
        I agree to the{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
