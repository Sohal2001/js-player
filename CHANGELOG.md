# Changelog

All notable changes to JS Player are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **APK + GitHub Pages workflow** (`.github/workflows/build-apk.yml`): builds an
  installable debug APK (no secrets) and deploys a GitHub Pages site
  (`site/index.html`) with a Download-APK button, install steps, and the live
  web demo. APK is also saved as a workflow artifact.
- One-click **Release workflow** (`.github/workflows/release.yml`): enter a
  version, pick the store(s)/track, and it bumps the web + native version
  numbers, tags `vX.Y.Z`, and publishes to Google Play and/or App Store Connect
  (with a `dry_run` option to build & sign without uploading).
- Android release signing wired into `android/app/build.gradle` (reads keystore
  details from environment variables in CI), so the published AAB is signed.
- ESLint configuration (`.eslintrc.json`) and Prettier configuration
  (`.prettierrc.json`, `.prettierignore`) plus `.editorconfig`.
- `YouTubePlayer` unit test suite (mocked IFrame API).
- Functional test layer (`src/functional/`) covering the public
  `createPlayer()` API and exports.
- New npm scripts: `test:unit`, `test:integration`, `test:functional`,
  `test:all`, `lint:fix`, `format:check`.
- Dependabot configuration for npm, GitHub Actions, and Gradle.
- Documentation: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`,
  `docs/README.md` (index), root `CONTRIBUTING.md` and `CHANGELOG.md`.

### Changed
- The publish workflows (`publish-android.yml`, `publish-ios.yml`) are now
  reusable (`workflow_call`) and are driven by the Release workflow. Tag pushes
  no longer publish directly — the Release workflow owns tagging so versioning
  and publishing happen in one place (no double publishing).
- CI now **enforces** ESLint and Prettier (`format:check`) — previously the lint
  step was non-fatal.
- Dev/preview server pinned to port **5177** (`strictPort`) so the E2E suite and
  CI always agree on the URL.
- E2E suite resolves Chromium via `E2E_CHROMIUM_PATH` / Playwright instead of a
  hard-coded path, and the base URL via `E2E_BASE_URL`.
- Expanded `docs/TESTING.md` and `docs/PIPELINE.md` for the functional layer and
  the lint/format/dependabot changes.

### Fixed
- Coverage now passes the 80% gate (previously failed at ~67% because
  `YouTubePlayer.js` was untested).

## [1.0.0]

### Added
- Initial JS Player (Juhi Sohal Player): zero-dependency video player with HTML5
  and YouTube IFrame backends, mobile-first UI, Capacitor Android/iOS projects,
  PWA shell, and CI + publish workflows.
