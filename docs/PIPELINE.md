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
| `.github/workflows/publish-android.yml` | version tag / manual | Build AAB → Google Play |
| `.github/workflows/publish-ios.yml` | version tag / manual | Build IPA → App Store Connect |
| `.github/dependabot.yml` | schedule | Weekly npm + GitHub Actions updates, monthly Gradle |

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

### Trigger options

```bash
# Option 1: version tag
git tag v1.2.0
git push --tags

# Option 2: manual from GitHub Actions tab
# → choose track: internal / alpha / beta / production
```

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

### Trigger options

```bash
# Option 1: version tag (same as Android)
git tag v1.2.0
git push --tags

# Option 2: manual
# → choose: testflight / appstore
```

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

All three workflows are triggered by the same version tag pattern: `v[0-9]+.[0-9]+.[0-9]+`

### Releasing a new version

```bash
# 1. Update version in package.json
npm version patch      # 1.0.0 → 1.0.1
npm version minor      # 1.0.0 → 1.1.0
npm version major      # 1.0.0 → 2.0.0

# 2. Update native version numbers
#    Android: android/app/build.gradle → versionCode + versionName
#    iOS: Xcode → General → Build + Version

# 3. Tag and push
git push && git push --tags
```

### Version sync script

Add to `package.json` scripts:

```json
"version:sync": "node -e \"const v = require('./package.json').version; require('fs').writeFileSync('android/app/build.gradle', require('fs').readFileSync('android/app/build.gradle','utf8').replace(/versionName \\\"[^\\\"]+\\\"/, 'versionName \\\"'+v+'\\\"'))\""
```

---

## Manual Pipeline Dispatch

Both publish workflows support `workflow_dispatch` — trigger from the GitHub UI:

1. Go to your repo → **Actions**
2. Select **Publish Android** or **Publish iOS**
3. Click **Run workflow**
4. Choose the track/destination and run

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
