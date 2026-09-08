import { useMemo } from "react";
import RPNInput, {
  parsePhoneNumber,
  getCountryCallingCode,
  getCountries,
} from "react-phone-number-input";
import enLabels from "react-phone-number-input/locale/en.json";
import "react-phone-number-input/style.css";
import { ChevronDown } from "lucide-react";

/**
 * Converts ISO 2-letter country code (e.g. 'IN') to Unicode Flag Emoji (e.g. '🇮🇳')
 */
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

/**
 * Generate rich labels for every country: "🇮🇳 India (+91)"
 * This ensures the dropdown options display Flag + Country Name + Calling Code!
 */
const richCountryLabels = {};
try {
  const allCountries = getCountries();
  for (const c of allCountries) {
    const name = enLabels[c] || c;
    const flag = getFlagEmoji(c);
    let callingCode = "";
    try {
      callingCode = getCountryCallingCode(c);
    } catch {}
    richCountryLabels[c] = `${flag} ${name} (+${callingCode})`.trim();
  }
} catch (err) {
  console.warn("Error building rich country labels:", err);
}

/**
 * Helper to map dial code (e.g. "+91") to ISO country code (e.g. "IN")
 */
const getCountryFromDialCode = (dialCode) => {
  if (!dialCode) return "IN";
  const clean = dialCode.replace("+", "").trim();
  if (clean === "91") return "IN";
  if (clean === "1") return "US";
  if (clean === "44") return "GB";
  if (clean === "971") return "AE";
  try {
    const countries = getCountries();
    const found = countries.find((c) => getCountryCallingCode(c) === clean);
    return found || "IN";
  } catch {
    return "IN";
  }
};

/**
 * Custom Country Select Component for react-phone-number-input
 * Shows Country Flag + Calling Code on the button, and Flag + Name + Code in options!
 */
const CustomCountrySelect = ({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: Icon,
  ...rest
}) => {
  let callingCode = "";
  if (value) {
    try {
      callingCode = `+${getCountryCallingCode(value)}`;
    } catch {}
  }
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="PhoneInputCountry flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition cursor-pointer relative select-none mr-2.5 shrink-0">
      {/* Native Select overlaid for full keyboard search and mobile support */}
      <select
        disabled={disabled || readOnly}
        value={value || "ZZ"}
        onChange={(e) =>
          onChange(e.target.value === "ZZ" ? undefined : e.target.value)
        }
        className="PhoneInputCountrySelect absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
        {...rest}
      >
        {options.map((opt) => (
          <option
            key={opt.value || "ZZ"}
            value={opt.value || "ZZ"}
            disabled={opt.divider}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {/* Flag icon */}
      {selectedOption && Icon && (
        <div className="shrink-0 flex items-center">
          <Icon aria-hidden country={value} label={selectedOption.label} />
        </div>
      )}

      {/* Country calling code written next to the flag on the button */}
      {callingCode && (
        <span className="text-xs font-bold text-slate-800 shrink-0">
          {callingCode}
        </span>
      )}

      {/* Down arrow icon */}
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
    </div>
  );
};

/**
 * PhoneInput component using react-phone-number-input
 * Displays Country Flag, Country Name, and Country Code in both button and options!
 */
const PhoneInput = ({
  countryCode = "+91",
  onCountryCodeChange,
  phone = "",
  onPhoneChange,
  error = "",
  placeholder = "98765 43210",
  disabled = false,
  required = true,
  name = "phone",
  id = "phone",
  className = "",
  theme = "amber", // "amber" | "blue"
}) => {
  // Determine active country ISO code from dial code
  const currentCountry = useMemo(
    () => getCountryFromDialCode(countryCode),
    [countryCode]
  );

  // Combine country code and phone for react-phone-number-input
  const combinedValue = useMemo(() => {
    if (!phone) return "";
    const cleanDigits = String(phone).replace(/\D/g, "");
    if (!cleanDigits) return "";
    const activeCode = countryCode || "+91";
    return `${activeCode}${cleanDigits}`;
  }, [countryCode, phone]);

  const handleChange = (val) => {
    if (!val) {
      if (onPhoneChange) onPhoneChange("");
      return;
    }

    try {
      const parsed = parsePhoneNumber(val);
      if (parsed) {
        const callingCode = `+${parsed.countryCallingCode}`;
        const nationalNum = parsed.nationalNumber;

        if (onCountryCodeChange && callingCode !== countryCode) {
          onCountryCodeChange(callingCode);
        }
        if (onPhoneChange) {
          onPhoneChange(nationalNum);
        }
        return;
      }
    } catch {
      // Fallback
    }

    const digits = val.replace(/\D/g, "");
    if (onPhoneChange) {
      onPhoneChange(digits);
    }
  };

  const handleCountryChange = (newCountry) => {
    if (newCountry) {
      try {
        const callingCode = `+${getCountryCallingCode(newCountry)}`;
        if (onCountryCodeChange && callingCode !== countryCode) {
          onCountryCodeChange(callingCode);
        }
      } catch (err) {
        console.warn("Country code lookup error:", err);
      }
    }
  };

  const ringFocusClass =
    theme === "amber"
      ? "focus-within:border-[#f59e0b] focus-within:ring-2 focus-within:ring-[#f59e0b]/20"
      : "focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20";

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`career-connect-phone-container flex items-center w-full px-3 py-1.5 rounded-xl bg-slate-50 border transition-all ${
          error
            ? "border-red-400 bg-red-50/20"
            : `border-slate-200 hover:border-slate-300 ${ringFocusClass}`
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <RPNInput
          international
          countryCallingCodeEditable={false}
          defaultCountry="IN"
          country={currentCountry}
          onCountryChange={handleCountryChange}
          labels={richCountryLabels}
          countrySelectComponent={CustomCountrySelect}
          value={combinedValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          name={name}
          id={id}
          className="w-full text-sm text-slate-800 font-medium"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>
      )}

      {/* Scoped styles for react-phone-number-input */}
      <style>{`
        .career-connect-phone-container .PhoneInput {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .career-connect-phone-container .PhoneInputCountryIcon {
          width: 1.4rem;
          height: 1rem;
          border-radius: 2px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        }
        .career-connect-phone-container .PhoneInputCountrySelectArrow {
          display: none !important;
        }
        .career-connect-phone-container .PhoneInputInput {
          flex: 1;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          font-size: 0.875rem;
          line-height: 1.25rem;
          color: #0f172a;
          padding: 0.35rem 0;
          box-shadow: none !important;
          font-weight: 500;
        }
        .career-connect-phone-container .PhoneInputInput::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
};

export default PhoneInput;
