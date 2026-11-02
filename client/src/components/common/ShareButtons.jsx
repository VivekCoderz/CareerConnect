const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context; fall back for older mobile browsers.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
};

/**
 * "Copy link" and "Share on WhatsApp" for a public listing page.
 * @param {string} url - absolute URL to share
 * @param {string} text - WhatsApp message (should include the URL)
 * @param {(message: string, type?: "success"|"error") => void} [onNotify] - shows the copy result
 * @param {string} [className] - extra classes for the button row
 */
export default function ShareButtons({ url, text, onNotify, className = "" }) {
  const handleCopy = async () => {
    const ok = await copyText(url);
    if (onNotify) onNotify(ok ? "Link copied" : "Could not copy the link", ok ? "success" : "error");
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
      >
        🔗 Copy link
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text || url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}
