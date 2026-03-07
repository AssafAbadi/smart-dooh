# Use Your Phone’s Real Location for Ads

In **Expo Go**, the app cannot use your phone’s location for ads because Expo Go uses its own `Info.plist` (without our location usage descriptions). To get **real GPS-based ads**, you need to run a **development build** of the Adrive app: your own binary that includes the correct location keys.

---

## Option A: Development build on your iPhone (recommended)

This gives you one app on your phone that connects to your dev server and **can use real location**.

### 1. Prerequisites

- **Expo account** (free): https://expo.dev/signup  
- **Apple Developer account** (paid, $99/year) for installing on a **physical iPhone**.  
  If you only have a free Apple ID, you can still build for the **iOS Simulator** on a Mac (Option B).
- **EAS CLI** (one-time):

  ```bash
  npm install -g eas-cli
  eas login
  ```

### 2. Configure EAS (one-time per project)

From the **repo root** (or `apps/mobile-driver`):

```bash
cd apps/mobile-driver
eas build:configure
```

Use the defaults if you’re unsure. This ensures `eas.json` and the project are set for EAS Build.

### 3. Register your iPhone (one-time per device)

So EAS can install the build on your phone:

```bash
eas device:create
```

Open the URL on your **iPhone**, follow the steps to install the provisioning profile (Settings → General → VPN & Device Management), and add the device when prompted.

### 4. Build the iOS app

```bash
cd apps/mobile-driver
eas build --platform ios --profile development
```

Wait for the build to finish on Expo’s servers. At the end you’ll get a link to install the app on your registered device(s).

### 5. Install and run with your dev server

1. On your **iPhone**, open the build link and install the **Adrive** development build (the one that was just built).
2. On your **PC**, start the backend (if you want ads from your API):

   ```bash
   # From repo root, with NODE_PATH for the built backend
   $env:NODE_PATH="dist"; npx nx serve backend-api
   ```

3. Start the Expo dev server:

   ```bash
   cd apps/mobile-driver
   npx expo start
   ```

4. Open the **Adrive** development build on your iPhone (not Expo Go). It should show your project in the dev client UI; tap it to connect to your PC’s dev server (same WiFi, or use tunnel if needed).
5. When the app asks for **location**, tap **Allow While Using App** (or Allow). Ads will then use your **phone’s real location**.

---

## Option B: iOS Simulator on a Mac (no Apple Developer paid account)

If you have a **Mac with Xcode**:

```bash
cd apps/mobile-driver
npx expo run:ios
```

This builds and runs the app in the iOS Simulator. You can simulate location in the Simulator (e.g. Debug → Location → Custom Location) and the app will use it for ads.

---

## Summary

| How you run the app        | Can use phone’s real location? |
|----------------------------|---------------------------------|
| **Expo Go**                | No (fallback Tel Aviv only)    |
| **Development build** (EAS or `expo run:ios`) | Yes (after you allow location) |

Your `app.json` already has the correct `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`; they are used when you run a **development build**, not in Expo Go. After you allow location in the dev build, the drive screen will request ads using your real coordinates and the backend will return location-based ads.
