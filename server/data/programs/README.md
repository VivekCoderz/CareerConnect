# Career programme data (C05)

One JSON file per programme, named `<slug>.json`. `GET /api/programs` and
`GET /api/programs/:slug` (C09) serve these files; the server reads them once at start-up,
so a change goes live with the next deploy.

The slugs must stay in step with `client/src/pages/programs/programList.js` (C12) so the
cards open the right pages.

| Field         | Type                              | Notes                                              |
| ------------- | --------------------------------- | -------------------------------------------------- |
| `slug`        | string                            | Lowercase letters, digits and `-`; same as the file name |
| `title`       | string                            | Required                                           |
| `published`   | boolean                           | `false` hides it from the list and makes the detail URL a 404 |
| `order`       | number                            | Position on the list page (lowest first)           |
| `track`       | `data-ai` \| `software` \| `cloud-security` |                                          |
| `levels`      | list of `foundation`, `professional`, `advanced` | Levels offered, at least one, no repeats; e.g. `["foundation", "professional", "advanced"]` |
| `duration`    | string                            | e.g. `"8–12 weeks"`                                |
| `tools`       | string[]                          | Key tools                                          |
| `summary`     | string                            | Shown on the card and the page                     |
| `syllabus`    | `{ title, topics: string[] }[]`   |                                                    |
| `projects`    | string[]                          |                                                    |
| `mentorship`  | string                            |                                                    |
| `internship`  | string                            |                                                    |
| `certificate` | string                            | C02: final wording comes from Ram Mohan sir        |
| `certificateImage` | string                          | C02 sample certificate: `""` until it exists, then `"/programs/certificates/<slug>.webp"` (file in `client/public`) or an `https://` URL |
| `faq`         | `{ question, answer }[]`          |                                                    |

Leave a section empty (`""` or `[]`) until the real content is agreed; the page hides
empty sections. Do not fill them with placeholder text.

**No trainer names, batch dates or class timings.** The team shares those on the call
after an enquiry. The server refuses to start if a file has a field such as `trainer`,
`batch`, `schedule` or `startDate`.
