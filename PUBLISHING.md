# Publishing JS Player (Juhi Sohal Player)
## Android & iOS App Store Guide

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | bundled with Node |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |
| Java JDK | 17 | bundled with Android Studio |
| Xcode | 15+ | Mac App Store (macOS only) |
| CocoaPods | latest | `sudo gem install cocoapods` |
| Apple Developer Account | — | https://developer.apple.com/account |
| Google Play Developer Account | — | https://play.google.com/console |

---

## Step 1 — Build the Web App

```bash
cd js-player
npm install
npm run build          # outputs to dist-app/
```

Verify: `dist-app/index.html` exists.

---

## Step 2 — Sync with Capacitor

```bash
npx cap sync           # copies dist-app/ into android/ and ios/ WebView assets
```

---

## ANDROID

### Step 3A — Open in Android Studio

```bash
npx cap open android
```

Android Studio opens `js-player/android/`.

### Step 4A — Configure App Identity

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.juhisohal.jsplayer"   // must match Play Store
        versionCode 1                             // increment for every release
        versionName "1.0.0"
        minSdk 24
        targetSdk 35
    }
}
```

### Step 5A — Add App Icons (Android)

Replace the placeholder icons in Android Studio:

1. Right-click `app/src/main/res` → **New → Image Asset**
2. Source: `public/icons/icon-512.png` (or use the SVG)
3. Icon type: **Launcher Icons (Adaptive and Legacy)**
4. Generate — this creates all `mipmap-*` sizes automatically

### Step 6A — Create a Release Keystore (one-time)

```bash
keytool -genkey -v \
  -keystore jsplayer-release.jks \
  -alias jsplayer \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> **Keep `jsplayer-release.jks` safe and secret — losing it means you can never update your app.**

### Step 7A — Configure Signing

Create `android/keystore.properties` (add to `.gitignore`!):

```properties
storeFile=../../jsplayer-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=jsplayer
keyPassword=YOUR_KEY_PASSWORD
```

Edit `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(rootProject.file("keystore.properties")))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 8A — Build the Release AAB

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**

Or via command line:

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 9A — Publish to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. **Create app** → fill in name "JS Player", default language, app/game, free/paid
3. Complete the **Dashboard checklist**:
   - App content (privacy policy URL, target audience, ads declaration)
   - Store listing (description, screenshots, feature graphic)
   - Content rating questionnaire
4. **Production → Create new release → Upload AAB**
5. Set rollout to **10%** initially → monitor crash rate → increase to 100%

**Required store assets:**

| Asset | Size |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | 2–8, min 320px, max 3840px |
| Short description | ≤ 80 chars |
| Full description | ≤ 4000 chars |

---

## iOS

### Step 3B — Install CocoaPods dependencies

```bash
cd ios/App
pod install
cd ../..
```

### Step 4B — Open in Xcode

```bash
npx cap open ios
```

Xcode opens `js-player/ios/App/App.xcworkspace` (always open the `.xcworkspace`, not `.xcodeproj`).

### Step 5B — Configure App Identity

In Xcode: Select **App target → General**

| Field | Value |
|-------|-------|
| Bundle Identifier | `com.juhisohal.jsplayer` |
| Version | `1.0.0` |
| Build | `1` (increment each submission) |
| Deployment Target | iOS 16.0 |

### Step 6B — Add App Icons (iOS)

1. In Xcode: open `App/Assets.xcassets/AppIcon.appiconset`
2. Replace placeholders with correctly-sized PNGs:
   - 1024×1024 for App Store
   - 60×60 @2x (120), @3x (180) — iPhone
   - 76×76 @2x (152) — iPad
3. Or use [MakeAppIcon](https://makeappicon.com) — upload `icon-1024.png`, download the Xcode set

### Step 7B — Configure Signing

In Xcode: **App target → Signing & Capabilities**

1. Check **Automatically manage signing**
2. Select your **Team** (Apple Developer account)
3. Xcode generates provisioning profiles automatically

### Step 8B — Configure Privacy Descriptions

Edit `ios/App/App/Info.plist` — add entries for any permissions used:

```xml
<!-- Local file access via Files app -->
<key>NSPhotoLibraryUsageDescription</key>
<string>JS Player needs access to your photos to play local videos.</string>

<!-- If using microphone (not needed for playback) — omit if unused -->
```

### Step 9B — Build & Archive

1. Set scheme to **Any iOS Device (arm64)** (not a simulator)
2. **Product → Archive**
3. Xcode Organizer opens automatically

### Step 10B — Submit to App Store Connect

In Xcode Organizer:

1. Select the archive → **Distribute App**
2. Choose **App Store Connect** → **Upload**
3. Follow the wizard (strip Swift symbols, upload symbols for crash reports)

In [App Store Connect](https://appstoreconnect.apple.com):

1. **My Apps → + → New App**
   - Platform: iOS
   - Bundle ID: `com.juhisohal.jsplayer`
   - SKU: `jsplayer-001`
2. Fill **App Information** (name, subtitle, category: Entertainment)
3. Fill **App Store** tab:
   - Description, keywords, support URL, privacy policy URL
   - Screenshots: 6.7" (iPhone 15 Pro Max) + 12.9" (iPad Pro) required
4. Select the uploaded build
5. Answer **Export Compliance** (no encryption → No)
6. **Submit for Review** → typically 24–48 hours

**Required App Store assets:**

| Asset | Size |
|-------|------|
| iPhone 6.7" screenshot | 1290×2796 |
| iPhone 6.5" screenshot | 1242×2688 |
| iPad 12.9" screenshot | 2048×2732 |
| App preview video | 1080×1920, 15–30s (optional) |

---

## Versioning for Future Updates

Each time you update the app:

```bash
# 1. Update version in package.json
# 2. Update versionCode (Android) or Build number (iOS)
npm run build
npx cap sync
# Then rebuild and upload new AAB / archive as above
```

---

## CI/CD Automation (optional)

See `.github/workflows/release.yml` in the root repo for a GitHub Actions pipeline that:
- Runs tests
- Builds the AAB automatically on version tags
- Uploads to Google Play Internal Track via Fastlane

---

## YouTube Compliance Reminder

The app uses only the **official YouTube IFrame API**.  
Both stores require a Privacy Policy — state clearly:
- No YouTube video files are downloaded or stored
- YouTube playback is provided via YouTube's embedded player
- YouTube's Terms of Service apply to all YouTube content

Link your Privacy Policy in both Play Console and App Store Connect.
