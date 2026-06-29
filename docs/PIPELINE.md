# CI/CD Pipeline Guide — JS Player

Complete reference for the automated build, test, and publish pipelines.

---

## Overview

```
Push to feature branch
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  ci.yml — runs on every push + PR                     │
│  ┌─────────────┐  ┌──────────┐  ┌───────┐  ┌──────┐  │
│  │ unit-tests  │  │ coverage │  │ lint  │  │ build│  │
│  │ (Node 18/20/│  │ (80% gate│  │(ESLint│  │(lib+ │  │
│  │  22 matrix) │  │  )       │  │)      │  │ app) │  │
│  └─────────────┘  └──────────┘  └───────┘  └──────┘  │
│                                               │        │
│                                  ┌────────────┘        │
│                                  ▼                      │
│                          ┌────────────┐                │
│                          │    e2e     │                │
│                          │(Playwright)│                │
│                          └────────────┘                │
└───────────────────────────────────────────────────────┘
        │
        ▼ merge to main
        │
        ▼ push version tag  v1.2.3
        │
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
┌──────────────────────┐                 ┌──────────────────────┐
│  publish-android.yml │                 │  publish-ios.yml     │
│  (ubuntu-latest)     │                 │  (macos-latest)      │
│                      │                 │                      │
│  1. npm ci + test    │                 │  1. npm ci + test    │
│  2. npm run build    │                 │  2. npm run build    │
│  3. cap sync android │                 │  3. cap sync ios     │
│  4. gradlew bundle   │                 │  4. pod install      │
│  5. Play Store upload│                 │  5. xcodebuild arch. │
│  6. GitHub Release   │                 │  6. App Store upload │
└──────────────────────┘                 └──────────────────────┘
```

---

## Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/ci.yml` | push / PR | Tests (unit + integration + functional), lint, format, build, E2E |
| `.github/workflows/release.yml` | manual | **One-click release** — bump version, tag, and publish to the selected store(s) |
| `.github/workflows/publish-android.yml` | manual / called by Release | Build signed AAB → Google Play |
| `.github/workflows/publish-ios.yml` | manual / called by Release | Build signed IPA → App Store Connect |
| `.github/dependabot.yml` | schedule | Weekly npm + GitHub Actions updates, monthly Gradle |

## One-click Release (`release.yml`)

The simplest way to ship. **Actions → "Release — bump, tag & publish" → Run
workflow**, then fill in:

| Input | Meaning |
|-------|---------|
| `version` | Marketing version `X.Y.Z` (no leading `v`) |
| `platforms` | `both`, `android`, or `ios` |
| `android_track` | `internal` / `alpha` / `beta` / `production` |
| `ios_destination` | `testflight` / `appstore` |
| `dry_run` | Build & sign but **don't** upload to the stores (safe rehearsal) |

What it does:

1. **prepare** — bumps `package.json`, `android/app/build.gradle`
   (`versionName` + `versionCode`) and the iOS Xcode project
   (`MARKETING_VERSION` + `CURRENT_PROJECT_VERSION`), commits, and pushes tag
   `vX.Y.Z`. The native build numbers use the workflow run number so each upload
   is strictly increasing (stores reject re-used build numbers).
2. **android / ios** — calls the reusable publish workflows for the selected
   platform(s), building from the freshly-created tag.
3. **github-release** — creates a GitHub Release for the tag (skipped on dry runs).

> Requires the publishing secrets below. With branch protection on `main`, allow
> the `github-actions` bot to push the version-bump commit (or run the release
> from an unprotected branch).
>
> Tag pushes no longer publish on their own — the Release workflow owns tagging
> so versioning and publishing happen in one place (and never twice).

---

## CI Workflow (`ci.yml`)

### Jobs

#### `unit-tests`

Runs the full jsdom Vitest suite — **unit + integration + functional** tests
(`npm test`) across Node 18, 20, and 22.

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
```

Upload coverage artifact (Node 20 only).

#### `coverage`

Depends on `unit-tests`. Runs `npm run test:coverage` which enforces:

| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

Fails CI if thresholds aren't met.

#### `lint`

Runs two gates and **fails CI** if either does not pass:

- `npm run lint` — ESLint (`eslint:recommended` + project rules; config in `.eslintrc.json`)
- `npm run format:check` — Prettier formatting check (config in `.prettierrc.json`)

Fix locally with `npm run lint:fix` and `npm run format`.

#### `build`

Builds both outputs:
- `npm run build:lib` → `dist/js-player.es.js` + `dist/js-player.umd.js`
- `npm run build` → `dist-app/` (app bundle for Capacitor)

Uploads `dist-app/` as an artifact.

#### `e2e`

Depends on `build`. Installs the matching Chromium (`npx playwright install
chromium --with-deps`), starts the dev server on port **5177**, waits for it
(`wait-on`), then runs Playwright. Uploads results on failure.

> The dev server port is pinned to `5177` (`strictPort`) in `vite.config.js`, so
> the value used by `wait-on` and the E2E suite always matches. To point the
> suite at a pre-installed browser instead of the Playwright-managed one, set
> `E2E_CHROMIUM_PATH` (and optionally `E2E_BASE_URL`).

### Concurrency

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Cancels in-progress runs when a new commit is pushed to the same branch.

---

## Android Publish Workflow (`publish-android.yml`)

### How it runs

- **Via the Release workflow** (recommended) — handled automatically when you
  run `release.yml`.
- **Standalone** — Actions → **Publish Android** → Run workflow → choose the
  track (and `dry_run` to skip the actual upload).

### Required secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repo and add:

| Secret | How to get it |
|--------|---------------|
| `KEYSTORE_BASE64` | `base64 -i jsplayer-release.jks` |
| `KEYSTORE_PASSWORD` | Password used when generating the keystore |
| `KEY_ALIAS` | Alias used when generating the keystore |
| `KEY_PASSWORD` | Key password (often same as `KEYSTORE_PASSWORD`) |
| `GOOGLE_PLAY_JSON_KEY` | JSON content of the Google Play service account key |

### Creating the keystore (one-time)

```bash
keytool -genkey -v \
  -keystore jsplayer-release.jks \
  -alias jsplayer \
  -keyalg RSA -keysize 2048 -validity 10000

# Encode for GitHub secret
base64 -i jsplayer-release.jks | pbcopy   # macOS
base64 jsplayer-release.jks               # Linux
```

**Never commit `jsplayer-release.jks` to the repo.**

### Google Play service account setup

1. Google Play Console → Setup → API access
2. Link to a Google Cloud project
3. Create service account → grant "Release manager" role
4. Download JSON key → paste contents as `GOOGLE_PLAY_JSON_KEY` secret

### What the workflow does

1. Checks out code
2. Runs `npm test` (gate — fails publish if tests fail)
3. Builds the web app to `dist-app/`
4. Runs `npx cap sync android`
5. Decodes keystore from secret
6. Builds signed AAB: `./gradlew bundleRelease`
7. Uploads AAB to Google Play Internal track
8. Creates a GitHub Release (on tag push)

### Release flow

```
Internal track  →  test on your device
Alpha track     →  opt-in testers
Beta track      →  broader testers
Production      →  10% rollout → 100%
```

Promote tracks:

```bash
# Manually in Play Console, or:
cd android
bundle exec fastlane promote_production
```

---

## iOS Publish Workflow (`publish-ios.yml`)

### How it runs

- **Via the Release workflow** (recommended) — handled automatically when you
  run `release.yml`.
- **Standalone** — Actions → **Publish iOS** → Run workflow → choose
  `testflight` / `appstore` (and `dry_run` to skip the actual upload).

> iOS publishing must run on a macOS runner — the workflow already sets
> `runs-on: macos-latest`.

### Required secrets

| Secret | How to get it |
|--------|---------------|
| `CERTIFICATES_P12` | Export your Apple Distribution cert from Keychain as .p12, then `base64 -i cert.p12` |
| `CERTIFICATES_PASSWORD` | .p12 export password |
| `PROVISIONING_PROFILE_BASE64` | Download from Apple Developer portal, then `base64 -i profile.mobileprovision` |
| `APPLE_TEAM_ID` | 10-character ID from developer.apple.com/account |
| `APP_STORE_CONNECT_API_KEY_ID` | From App Store Connect → Users → Keys |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Same page as above |
| `APP_STORE_CONNECT_API_KEY_BASE64` | Download the .p8 file, then `base64 -i AuthKey_*.p8` |

### Code signing setup (one-time)

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles
2. Create an **App ID**: `com.juhisohal.jsplayer`
3. Create an **App Store Distribution Certificate**
4. Create an **App Store Provisioning Profile** linked to the above

Export the cert from Keychain Access:
- Open Keychain Access → My Certificates
- Right-click the distribution cert → Export → save as `.p12`

### What the workflow does

1. Checks out code
2. Runs `npm test` (gate)
3. Builds app to `dist-app/`
4. Runs `npx cap sync ios`
5. Runs `pod install` (CocoaPods)
6. Imports the .p12 certificate into the macOS keychain
7. Installs the provisioning profile
8. Writes the App Store Connect API key to file
9. Runs `xcodebuild archive` → `xcodebuild -exportArchive`
10. Uploads IPA to App Store Connect (TestFlight or App Store)

### TestFlight → App Store flow

```
TestFlight build   →  internal testers (immediate)
                   →  external testers (beta review, ~1 day)
                   →  App Store submission → review (1–2 days)
```

---

## Versioning

The **Release workflow handles versioning for you** — you just enter `X.Y.Z`
and it updates `package.json`, the Android `build.gradle`, and the iOS Xcode
project, then tags `vX.Y.Z`. The native build numbers come from the run number
so every store upload strictly increases.

If you ever need to bump versions by hand (e.g. for a local build):

```bash
npm version patch --no-git-tag-version   # 1.0.0 → 1.0.1 in package.json
# Android: android/app/build.gradle → versionCode + versionName
# iOS:     ios/App/App.xcodeproj/project.pbxproj → MARKETING_VERSION + CURRENT_PROJECT_VERSION
```

---

## Manual Pipeline Dispatch

Every workflow can be triggered from the GitHub UI (**Actions → select workflow
→ Run workflow**):

- **Release** — the normal path; enter a version and pick the store(s).
- **Publish Android / Publish iOS** — run a single platform without bumping the
  version (e.g. to re-publish a build, or with `dry_run` to rehearse).

---

## Monitoring

- **Actions tab** → real-time logs for every job
- **Artifacts** → download the AAB/IPA for local testing
- **Releases** → auto-generated from tags with changelog

### Notifications

Set up GitHub notification preferences or add Slack/email notifications:

```yaml
# Add to any job to notify on failure
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1.26.0
  with:
    channel-id: '#releases'
    slack-message: "Build failed: ${{ github.workflow }} on ${{ github.ref }}"
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## Troubleshooting

### Android build fails: "keystore not found"

The `KEYSTORE_BASE64` secret is malformed. Re-encode:

```bash
base64 -w 0 jsplayer-release.jks   # Linux (no line wrapping)
base64 -i jsplayer-release.jks     # macOS
```

### iOS: "No signing certificate found"

- Ensure the `.p12` was exported with the correct password
- The provisioning profile must be for `com.juhisohal.jsplayer` (App Store type)
- The cert and profile must be from the same Apple Developer account

### Tests fail on CI but pass locally

- Check Node version matches (`node: 20` in CI)
- Run `npm ci` (not `npm install`) locally to reproduce exact lockfile
- Check for timezone/locale differences in snapshot tests

### E2E: "Chromium not found"

In CI, `npx playwright install chromium --with-deps` installs it fresh.
On the remote agent, use the pre-installed path:

```js
executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH
  ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium/chrome-linux/chrome`
  : undefined,
```
