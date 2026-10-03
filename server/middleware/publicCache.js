// Cache-Control for public, non-personalised list responses (job/internship lists, feeds).
// Browsers and CDNs may reuse them for a short time, so a new listing can take up to
// PUBLIC_LIST_MAX_AGE seconds to appear. Never use this on routes that read req.user.

const PUBLIC_LIST_MAX_AGE = 60;

const publicCache = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    // Only successful responses: errors and 429s must not be reused.
    if (res.statusCode === 200) {
      res.set("Cache-Control", `public, max-age=${PUBLIC_LIST_MAX_AGE}`);
    }
    return json(body);
  };
  next();
};

module.exports = publicCache;
module.exports.PUBLIC_LIST_MAX_AGE = PUBLIC_LIST_MAX_AGE;
