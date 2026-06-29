# Development Guide — JS Player

How to set up, run, test, and contribute to JS Player locally.

---

## Prerequisites

- **Node.js 18, 20, or 22** (CI tests all three)
- **npm** (the repo ships a `package-lock.json` — use `npm ci` for reproducible installs)
- For native builds only: Android Studio / JDK 17 (Android) or Xcode + CocoaPods (iOS)

---

## Setup

```bash
git clone https://github.com/Sohal2001/js-player.git
cd js-player
npm ci          # or `npm install`
```

---

## Everyday commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the demo app on **http://localhost:5177** (hot reload) |
| `npm test` | Run unit + integration + functional tests (jsdom) |
| `npm run test:watch` | Same, re-running on change |
| `npm run test:coverage` | Tests + coverage report + threshold gate |
| `npm run test:e2e` | Playwright E2E (needs `npm run dev` running) |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with autofix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (used by CI) |
| `npm run build:lib` | Build the npm library → `dist/` |
| `npm run build` | Build the app bundle → `dist-app/` |

> The full test matrix is documented in [TESTING.md](./TESTING.md).

---

## Project layout

```
src/            Library source (see ARCHITECTURE.md)
demo/           Demo / PWA shell (Vite root)
public/         PWA manifest, service worker, icons
android/        Capacitor Android project
ios/            Capacitor iOS project
docs/           This documentation
.github/        CI, publish workflows, Dependabot
```

---

## Code style

- **Formatting** is owned by Prettier (`.prettierrc.json`): single quotes,
  semicolons, trailing commas, 80-column width, 2-space indent. Run
  `npm run format` before committing — CI runs `format:check`.
- **Linting** uses ESLint (`.eslintrc.json`, `eslint:recommended` + a few
  project rules). Test files and the YouTube global are configured via
  `overrides`. CI fails on any lint error.
- **`.editorconfig`** keeps editors consistent (LF, UTF-8, final newline).

---

## Recommended workflow

1. Branch from `main` (`feature/…` or `fix/…` — these trigger CI).
2. Write code **and tests** (pick the right layer — see TESTING.md).
3. Run the local gate before pushing:

   ```bash
   npm run lint && npm run format:check && npm run test:coverage
   ```

4. Open a PR. CI runs tests (Node 18/20/22), coverage, lint+format, build, and
   E2E. All jobs must pass to merge.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution conventions and
[PIPELINE.md](./PIPELINE.md) for how releases are cut.

---

## Working on the native apps

```bash
npm run build        # produce dist-app/
npx cap sync         # copy web build into android/ and ios/
npx cap open android # or: npx cap open ios
```

Releases are automated — push a `vX.Y.Z` tag (or dispatch the workflow) to build
and upload to Google Play / App Store Connect. Required signing secrets are
listed in [PIPELINE.md](./PIPELINE.md).
