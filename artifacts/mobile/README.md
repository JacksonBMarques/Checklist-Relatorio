# DiskReg Check — Mobile App

Android-only checklist and reports app built with Expo.

## Building a Signed APK for Android

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce signed Android APKs and AABs.

### Prerequisites

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Link the project to your Expo account (first time only):
   ```bash
   eas init
   ```
   This writes an `extra.eas.projectId` field into `app.json`, which EAS uses to
   associate builds with your Expo account. Commit the updated `app.json` after running this.

### Build Profiles

Three profiles are defined in `eas.json`:

| Profile | Output | Use case |
|---------|--------|----------|
| `development` | APK | Local testing with Expo Dev Client |
| `preview` | APK | Sideloading / internal distribution |
| `production` | AAB | Google Play Store upload |

### Build a Preview APK (sideloadable)

Run this command from the `artifacts/mobile` directory:

```bash
eas build --platform android --profile preview
```

EAS will:
- Upload your source to Expo's build servers
- Generate a keystore automatically (or use your own)
- Return a download link for the signed `.apk`

Download and transfer the APK to your Android device, then install it with "Install from unknown sources" enabled.

### Build a Production AAB (Google Play)

```bash
eas build --platform android --profile production
```

This produces a signed `.aab` (Android App Bundle) ready for upload to the Google Play Console.

### Using a Custom Keystore

To use your own signing keystore instead of the auto-generated one:

```bash
eas credentials
```

Select **Android → Keystore → Import keystore** and follow the prompts.

### App Details

- **Package name:** `com.diskregchecklist.app`
- **Version:** `1.0.0` (versionCode `1`)
- **Platforms:** Android only
