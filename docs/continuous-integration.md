# Continuous integration

CareerConnect uses GitHub Actions through `.github/workflows/ci.yml`.

## When it runs

The pipeline runs for:

- pull requests targeting `main`, `develop`, or `ram-mohan-code`;
- pushes to those branches; and
- manual runs from **GitHub → Actions → CareerConnect CI → Run workflow**.

If a newer commit is pushed to the same branch, the older in-progress run is cancelled.

## Required checks

### Client build and audit

1. Installs exactly the versions in `client/package-lock.json` with `npm ci`.
2. Fails on high or critical production dependency vulnerabilities.
3. Creates the Vite production build.
4. Keeps the generated `client/dist` artifact for seven days.

### Server tests and audit

1. Installs exactly the versions in `server/package-lock.json` with `npm ci`.
2. Fails on high or critical production dependency vulnerabilities.
3. Runs the complete Jest suite against an isolated MongoDB memory server.

The test job uses CI-only placeholder secrets and never reads the production MongoDB,
Firebase, Cloudinary, email, or session credentials.

## Branch protection

After this workflow has run once, configure these rules in **GitHub → Settings →
Branches → Add branch protection rule** for `main` and `develop`:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Select `Client build and audit` and `Server tests and audit`.
- Require branches to be up to date before merging.
- Do not allow force pushes.

## Frontend lint status

The current frontend has existing ESLint failures, so lint is not presented as a
passing CI check. Run it locally with:

```bash
npm run lint --prefix client
```

Once the existing findings are resolved, add this command after the client install
step in the workflow and make it required.

## Deployment

Production deployment remains controlled by the connected hosting platforms. Keep
their Git integrations configured to deploy only after changes reach the protected
deployment branch. No production secret is stored in this workflow.
