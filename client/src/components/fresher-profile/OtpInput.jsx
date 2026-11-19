import { useRef } from "react";

const LENGTH = 6;

// Six single-digit boxes: typing moves forward, Backspace on an empty box moves back,
// and pasting a code fills every box.
const OtpInput = ({ value, onChange, disabled = false, hasError = false, autoFocus = true }) => {
  const inputs = useRef([]);
  // An empty box in the middle is kept as a space, so later digits don't shift left.
  const digits = Array.from({ length: LENGTH }, (_, i) => (value[i] || "").trim());

  const focusBox = (index) => inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  const setDigits = (next) => onChange(next.map((d) => d || " ").join("").trimEnd());

  const handleChange = (index, raw) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    const next = [...digits];
    // A whole code typed or autofilled into one box spreads across the boxes.
    typed.split("").slice(0, LENGTH - index).forEach((d, offset) => {
      next[index + offset] = d;
    });
    setDigits(next);
    focusBox(index + typed.length);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        focusBox(index - 1);
      }
      setDigits(next);
    } else if (e.key === "ArrowLeft") {
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      focusBox(index + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusBox(pasted.length);
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-12 sm:w-12 sm:h-14 rounded-lg border bg-neutral-950 text-center text-lg font-semibold text-neutral-100 outline-none transition focus:ring-2 disabled:opacity-60 ${
            hasError
              ? "border-red-500/70 focus:ring-red-500/20"
              : "border-neutral-800 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/40"
          }`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
