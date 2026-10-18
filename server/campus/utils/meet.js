// Only real Google Meet links are stored for classes, so a wrong or malicious link is never shown
// behind the Join button.
const safeMeetUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || url.hostname !== "meet.google.com") return null;
    return `https://meet.google.com${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

module.exports = { safeMeetUrl };
