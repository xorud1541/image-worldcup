# Wedding Pick Deployment Pipeline Implementation Plan

**Date:** 2026-04-26
**Design spec:** `docs/superpowers/specs/2026-04-26-deployment-pipeline-design.md`
**Repo:** `xorud1541/image-worldcup`
**App type:** Vite + React static SPA

This plan implements the approved deployment pipeline only. It intentionally does not add automated tests, Sentry or other error tracking, a custom domain, TypeScript, backend functions, GitHub Actions, or `vercel.json`.

## Phase 1: Preflight And Scope Check

### 1.1 Confirm the approved spec and current repository state

- Files to create/modify: none.
- Commands to run:

```bash
sed -n '1,240p' docs/superpowers/specs/2026-04-26-deployment-pipeline-design.md
git status --short
sed -n '1,220p' package.json
sed -n '1,180p' src/main.jsx
sed -n '1,160p' .gitignore
```

- Expected outcome:
  - The spec confirms Vercel Git integration, ESLint as the build gate, GA4 loaded only when `VITE_GA4_MEASUREMENT_ID` exists, and no GitHub Actions.
  - `package.json` is the current source of scripts and dependencies.
  - Any unrelated local changes are identified before editing.
- Verification:
  - Confirm that planned changes are limited to `package.json`, `package-lock.json`, `eslint.config.js`, `src/lib/analytics.js`, `src/main.jsx`, `.env.example`, `.gitignore`, and `README.md`.
  - Do not revert or rewrite unrelated local work.

### 1.2 Confirm Node/npm are available

- Files to create/modify: none.
- Commands to run:

```bash
node --version
npm --version
```

- Expected outcome:
  - Node and npm versions are printed.
- Verification:
  - If either command is missing, install a current Node LTS locally before continuing.
  - Do not change app source files until dependency installation can be verified.

## Phase 2: Add ESLint And Make It The Build Gate

### 2.1 Install ESLint dependencies

- Files to create/modify:
  - Modify `package.json`.
  - Modify `package-lock.json`.
- Commands to run:

```bash
npm install --save-dev eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks globals
```

- Expected outcome:
  - The required ESLint packages are added under `devDependencies`.
  - `package-lock.json` is updated consistently by npm.
- Verification:

```bash
npm ls eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks globals
```

  - The command exits with code `0`.
  - Each installed package appears in the dependency tree.

### 2.2 Add the flat ESLint config

- Files to create/modify:
  - Create `eslint.config.js`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:

```js
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];
```

- Expected outcome:
  - ESLint 9 flat config is available at the repo root.
  - Browser globals such as `window`, `document`, `File`, and `URL` are recognized.
  - React JSX runtime rules avoid requiring `React` to be in scope solely for JSX.
- Verification:

```bash
npx eslint --print-config src/main.jsx >/tmp/wedding-pick-eslint-config.json
```

  - The command exits with code `0`.
  - `/tmp/wedding-pick-eslint-config.json` contains React and React Hooks rules.

### 2.3 Add npm scripts and wire ESLint into build

- Files to create/modify:
  - Modify `package.json`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:
  - Update `scripts` to include `lint`.
  - Change `build` so deployment is blocked when lint fails.

```json
{
  "scripts": {
    "dev": "vite",
    "lint": "eslint .",
    "build": "eslint . && vite build",
    "preview": "vite preview"
  }
}
```

- Expected outcome:
  - `npm run lint` runs ESLint over the repository.
  - `npm run build` runs `eslint .` before `vite build`.
- Verification:

```bash
npm run lint -- --help >/tmp/wedding-pick-eslint-help.txt
npm run build -- --help >/tmp/wedding-pick-build-help.txt
```

  - The scripts are recognized by npm.
  - If `npm run build -- --help` is awkward because of the chained command, skip it and verify the script directly in `package.json`.

### 2.4 Run ESLint and fix only lint-blocking issues

- Files to create/modify:
  - Modify only files that ESLint reports.
  - Likely candidates, if any: `src/App.jsx`, `src/store/usePickerStore.js`, `src/lib/fileUtils.js`, `src/main.jsx`.
- Commands to run:

```bash
npm run lint
```

- Expected outcome:
  - ESLint exits with code `0`.
  - If ESLint reports unused variables, missing hook dependencies, or obvious bug patterns, fix them minimally without changing product behavior.
- Verification:

```bash
npm run lint
git diff --check
```

  - `npm run lint` exits with code `0`.
  - `git diff --check` reports no whitespace errors.

### 2.5 Verify the gated build

- Files to create/modify: none, unless the build exposes a lint or bundling issue that must be fixed.
- Commands to run:

```bash
npm run build
```

- Expected outcome:
  - `eslint .` passes first.
  - Vite builds the static app into `dist/`.
- Verification:

```bash
test -d dist
test -f dist/index.html
```

  - Both commands exit with code `0`.
  - Do not commit `dist/`; it is a build artifact and should remain ignored.

## Phase 3: Add GA4 Integration Gated By Environment Variable

### 3.1 Create the analytics helper

- Files to create/modify:
  - Create `src/lib/analytics.js`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:

```js
const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (!ga4MeasurementId || initialized) {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args) => {
    window.dataLayer.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", ga4MeasurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    ga4MeasurementId,
  )}`;
  document.head.appendChild(script);
}
```

- Expected outcome:
  - `initAnalytics()` is a no-op when `VITE_GA4_MEASUREMENT_ID` is absent.
  - When the variable is present, the helper creates `window.dataLayer`, defines `window.gtag`, queues the GA4 init/config calls, and injects the `gtag.js` script.
  - The code does not depend on TypeScript or any extra package.
  - No SSR guard (`typeof window`) — this app is a browser-only SPA.
- Verification:

```bash
npm run lint
```

  - ESLint exits with code `0`.

### 3.2 Hook analytics into the React entrypoint

- Files to create/modify:
  - Modify `src/main.jsx`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:
  - Import `initAnalytics`.
  - Call it after the React root render call, outside the React tree, so React Strict Mode does not double-run it.

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

initAnalytics();
```

- Expected outcome:
  - The app initializes analytics once after mount.
  - Local and preview builds without `VITE_GA4_MEASUREMENT_ID` continue to work with no console error.
- Verification:

```bash
npm run lint
npm run build
```

  - Both commands exit with code `0`.

### 3.3 Add documented environment variable example

- Files to create/modify:
  - Create `.env.example`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:

```bash
# Vercel: set this variable in Production scope only.
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

- Expected outcome:
  - Developers can see the required variable name and expected GA4 ID shape.
  - No real measurement ID is committed.
- Verification:

```bash
sed -n '1,80p' .env.example
```

  - The file contains only the example value and production-scope note.

### 3.4 Ensure local env files are ignored

- Files to create/modify:
  - Modify `.gitignore` if needed.
- Commands to run:
  - First inspect whether env-local ignores already exist:

```bash
grep -nE '^\.env(\*\.local|\.local)$' .gitignore || true
```

  - If missing, add:

```gitignore
.env.local
.env*.local
```

- Expected outcome:
  - Local or secret env files are not committed.
  - `.env.example` remains trackable.
- Verification:

```bash
git check-ignore .env.local
git check-ignore .env.production.local
git check-ignore .env.example || true
```

  - The first two commands identify the ignore rules.
  - `.env.example` should not be ignored.

### 3.5 Verify GA4 gating locally

- Files to create/modify: none.
- Commands to run:

```bash
npm run build
npm run dev
```

- Note: `npm run dev` is a long-running server. After verification, return to the terminal and stop it with `Ctrl+C` before continuing the next step.
- Expected outcome:
  - With no `VITE_GA4_MEASUREMENT_ID` set, the app runs normally.
  - Browser devtools show no `gtag/js` network request.
- Verification:
  - Open the local dev URL printed by Vite.
  - In browser devtools Network tab, filter for `gtag/js`; there should be no request.
  - In Console, there should be no analytics-related error.

### 3.6 Verify GA4 loads when the variable exists

- Files to create/modify: none.
- Commands to run:

```bash
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX npm run build
npm run preview
```

- Note: `npm run preview` is a long-running server. After verification, return to the terminal and stop it with `Ctrl+C` before continuing the next step.
- Expected outcome:
  - The build succeeds with the env variable present.
  - The preview server serves a bundle that attempts to load GA4.
- Verification:
  - Open the local preview URL printed by Vite.
  - In browser devtools Network tab, filter for `gtag/js`; a request with `id=G-XXXXXXXXXX` should appear.
  - This is a local verification only; do not commit any real GA4 ID.

## Phase 4: Update README Deployment Documentation

### 4.1 Add a deployment section

- Files to create/modify:
  - Modify `README.md`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:
  - Add a `## Deployment` or `## 배포` section that documents:
    - Hosting provider: Vercel.
    - Production trigger: push/merge to `main`.
    - Preview trigger: every PR or branch push connected to Vercel.
    - Build command: `npm run build`.
    - Output directory: `dist`.
    - Build gate: `npm run build` runs `eslint . && vite build`.
    - Production URL placeholder: `<project>.vercel.app` until the first deploy provides the actual URL.
- Expected outcome:
  - README explains how deployment works without adding a separate deployment document unless desired.
- Verification:

```bash
grep -nE 'Deployment|배포|Vercel|VITE_GA4_MEASUREMENT_ID|Rollback|롤백' README.md
```

  - The README contains deployment, env var, and rollback information.

### 4.2 Document environment variables

- Files to create/modify:
  - Modify `README.md`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:
  - Add a small environment variable table:

```md
| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `VITE_GA4_MEASUREMENT_ID` | Vercel Production only | Yes for analytics, no for app runtime | Loads GA4 on the public production site. |
```

- Expected outcome:
  - Preview and development environments are clearly documented as GA4-disabled.
- Verification:

```bash
grep -n 'VITE_GA4_MEASUREMENT_ID' README.md
```

  - The variable appears in the deployment section.

### 4.3 Document rollback

- Files to create/modify:
  - Modify `README.md`.
- Commands to run:
  - No command is required beyond editing the file.
- Implementation:
  - Add rollback guidance:
    - Open Vercel dashboard.
    - Go to the project Deployments tab.
    - Select the previous successful deployment.
    - Use "Promote to Production".
- Expected outcome:
  - Operators can recover from a runtime regression without changing code.
- Verification:

```bash
grep -nE 'Promote to Production|rollback|롤백' README.md
```

  - Rollback instructions are present.

## Phase 5: Manual Vercel Setup

All steps in this phase are MANUAL and happen in the Vercel and Google Analytics web UIs. They are not code changes.

### 5.1 Create or confirm the Vercel account

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - Sign in to Vercel with GitHub OAuth.
  - Confirm Vercel can access the GitHub account or organization that owns `xorud1541/image-worldcup`.
- Expected outcome:
  - Vercel can import the repository.
- Verification:
  - The repository appears in Vercel's "New Project" import list.

### 5.2 Import the GitHub project

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - In Vercel, click "New Project".
  - Import `xorud1541/image-worldcup`.
  - Confirm these project settings:
    - Framework Preset: `Vite`.
    - Root Directory: `./`.
    - Build Command: `npm run build`.
    - Output Directory: `dist`.
    - Install Command: Vercel default, usually `npm install`.
- Expected outcome:
  - Vercel creates a project connected to the GitHub repository.
  - Vercel will create preview deployments for PRs and production deployments for `main`.
- Verification:
  - Vercel project settings show Git integration enabled for `xorud1541/image-worldcup`.
  - There is no `vercel.json`; the Vite preset handles this static SPA.

### 5.3 Create GA4 property and get the measurement ID

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - In Google Analytics, create or open the GA4 property for Wedding Pick.
  - Create a Web data stream for the production Vercel URL once known, or prepare it with the expected site URL.
  - Copy the measurement ID with the `G-` prefix.
- Expected outcome:
  - A GA4 measurement ID is available for production.
- Verification:
  - The copied value matches the shape `G-XXXXXXXXXX`.

### 5.4 Add the GA4 variable in Vercel Production scope only

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - In Vercel project settings, open Environment Variables.
  - Add `VITE_GA4_MEASUREMENT_ID`.
  - Set the value to the real GA4 measurement ID.
  - Check Production only.
  - Leave Preview and Development unchecked.
- Expected outcome:
  - Production builds receive the GA4 ID.
  - Preview and development deployments do not receive the GA4 ID.
- Verification:
  - Vercel Environment Variables UI shows `VITE_GA4_MEASUREMENT_ID` scoped only to Production.

### 5.5 Trigger the first production deployment

- Files to create/modify: none, unless the README production URL placeholder needs to be replaced after deployment.
- Commands to run:

```bash
git status --short
git add package.json package-lock.json eslint.config.js src/lib/analytics.js src/main.jsx .env.example .gitignore README.md
git commit -m "chore: add vercel deployment pipeline"
git push origin main
```

- Expected outcome:
  - Vercel receives the `main` push.
  - Vercel runs `npm install` and `npm run build`.
  - The build fails if ESLint fails.
  - On success, Vercel assigns the production URL.
- Verification:
  - In Vercel, the deployment status is successful.
  - Build logs include `eslint . && vite build`.
  - The production URL opens in a browser.

### 5.6 Record the production URL in README

- Files to create/modify:
  - Modify `README.md`.
- Commands to run:

```bash
git checkout main
git pull --ff-only
```

  - Then edit README to replace `<project>.vercel.app` with the actual production URL.

```bash
npm run lint
npm run build
git add README.md
git commit -m "docs: record production deployment URL"
git push origin main
```

- Expected outcome:
  - README points to the actual Vercel production URL.
- Verification:

```bash
grep -n 'vercel.app' README.md
```

  - The actual URL appears in README.

## Phase 6: First Deploy Smoke Test

### 6.1 Verify production page load

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - Open the production Vercel URL in a desktop browser.
  - Hard refresh once.
- Expected outcome:
  - The Wedding Pick app loads without a blank page.
  - No obvious console runtime errors appear.
- Verification:
  - Browser Console has no uncaught app errors.
  - Browser Network tab shows the static assets returning `200`.

### 6.2 Verify the core static SPA workflow

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - Load a small local set of supported images.
  - Switch grid sizes.
  - Select and unselect an image.
  - Move focus with arrow keys.
  - Open and close the loupe.
  - Export a ZIP if sample files are safe to download.
- Expected outcome:
  - The production deployment behaves like the local app.
- Verification:
  - No console errors appear during the smoke workflow.
  - ZIP export completes if that part of the smoke test is performed.

### 6.3 Verify production GA4

- Files to create/modify: none.
- Commands to run: none.
- MANUAL steps:
  - Disable browser ad blockers for the production URL during verification.
  - Open the production Vercel URL.
  - In browser devtools Network tab, filter for `gtag/js` and `collect`.
  - In Google Analytics Realtime, check for at least one active user or page view.
- Expected outcome:
  - Production loads GA4 because `VITE_GA4_MEASUREMENT_ID` exists in the Production environment.
- Verification:
  - A `gtag/js?id=G-...` request appears.
  - GA4 Realtime receives the visit.

### 6.4 Verify preview deployment and GA4 isolation

- Files to create/modify: none, unless using an existing implementation PR.
- Commands to run:
  - If no PR already exists, create a throwaway preview branch with an empty commit:

```bash
git checkout -b chore/vercel-preview-smoke
git commit --allow-empty -m "chore: verify vercel preview"
git push -u origin chore/vercel-preview-smoke
```

- MANUAL steps:
  - Open a GitHub PR from `chore/vercel-preview-smoke` to `main`, or use the implementation PR if one already exists.
  - Wait for Vercel to post the preview URL/status.
  - Open the preview URL.
- Expected outcome:
  - Vercel creates a preview deployment for the branch or PR.
  - The preview app loads normally.
  - GA4 does not load because the env var is Production scope only.
- Verification:
  - GitHub PR checks show Vercel success.
  - Browser Network tab on the preview URL has no `gtag/js?id=G-...` request.
  - GA4 Realtime does not receive preview traffic from this visit.

### 6.5 Clean up the smoke-test branch if used

- Files to create/modify: none.
- Commands to run:

```bash
git checkout main
git branch -D chore/vercel-preview-smoke
git push origin --delete chore/vercel-preview-smoke
```

- Expected outcome:
  - The temporary preview branch is removed locally and remotely.
- Verification:

```bash
git branch --list chore/vercel-preview-smoke
git ls-remote --heads origin chore/vercel-preview-smoke
```

  - Both commands return no matching branch.

## Phase 7: Final Verification Checklist

### 7.1 Verify files changed match the approved scope

- Files to create/modify: none.
- Commands to run:

```bash
git status --short
git diff --name-only HEAD
```

- Expected outcome:
  - Only planned files changed:
    - `package.json`
    - `package-lock.json`
    - `eslint.config.js`
    - `src/lib/analytics.js`
    - `src/main.jsx`
    - `.env.example`
    - `.gitignore`
    - `README.md`
- Verification:
  - No `vercel.json`, GitHub Actions workflow, test framework, Sentry integration, custom domain config, or TypeScript migration appears in the diff.

### 7.2 Verify local commands before handoff

- Files to create/modify: none.
- Commands to run:

```bash
npm run lint
npm run build
git diff --check
```

- Expected outcome:
  - Lint passes.
  - The gated Vite build passes.
  - The diff has no whitespace errors.
- Verification:
  - All commands exit with code `0`.

## Risks / Watch-outs

- Vercel environment scope is the main analytics risk. If `VITE_GA4_MEASUREMENT_ID` is enabled for Preview or Development, preview/local traffic can pollute GA4 data.
- ESLint may expose existing unused variables or hook dependency issues. Fix only the reported issues needed for the deployment gate, and avoid product refactors in the pipeline change.
- React Strict Mode can double-run component effects in development. Keep `initAnalytics()` outside the React tree and guard it with an `initialized` flag.
- GA4 verification can be blocked by browser privacy tools. Use a clean browser profile or temporarily disable blockers for the production URL when validating.
- Do not add `vercel.json` unless Vercel's Vite preset fails unexpectedly. The approved design says it is unnecessary.
- Do not add tests, Sentry, custom domain setup, TypeScript, backend functions, or GitHub Actions as part of this task.
