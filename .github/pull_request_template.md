## What this PR does

<!-- One or two sentences. Start the PR title with the tracker ID, e.g. [S03] Force pending approval on new jobs -->

## How I tested it

<!-- Steps you ran, roles you logged in as, screenshots for UI changes -->

## Checklist

- [ ] The PR targets `launch/job-portal`, not `main`. Only Vivek merges into `main`.
- [ ] `npm run lint` passes in `client/` and/or `server/`. If I fixed old lint errors, I ran `npm run lint:prune` and committed the updated `eslint-suppressions.json`.
- [ ] No new file is over 500 lines. For files that are already large, I didn't add a new feature inside them. I put new code in a new component or module and imported it.
- [ ] **No copy-paste.** Where the same UI or logic already exists (for example the student, fresher and professional versions), I reused or extracted a shared component or function instead of duplicating it.
- [ ] The server checks every rule. It doesn't rely on status, role, price or IDs sent by the client.
- [ ] No secrets, `.env` files or hardcoded keys.
- [ ] No `alert()`, empty `catch {}` or leftover `console.log`.
