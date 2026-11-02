// In-memory copy of a page's last loaded data, per signed-in user (FL-09). Coming back to a
// page shows it straight away while fresh data loads, instead of a full-screen loader.
// Memory only: a full page reload or another user's session starts empty.
const cache = new Map();

const keyFor = (page, userId) => (userId ? `${page}:${userId}` : null);

/** The cached data for this page and user, or null. */
export const getPageCache = (page, userId) => {
  const key = keyFor(page, userId);
  return key && cache.has(key) ? cache.get(key) : null;
};

/** Remembers this page's data for the user (ignored without a user id). */
export const setPageCache = (page, userId, data) => {
  const key = keyFor(page, userId);
  if (key && data) cache.set(key, data);
};
