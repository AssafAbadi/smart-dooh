# Adrive Mobile Driver App

React Native 0.74 + Expo (Bare-capable) driver app. Uses `@smart-dooh/shared-dto` and `@smart-dooh/shared-sdk`.

## Design

- **Theme:** Dark mode — Deep Graphite `#1A1C1E`, Industrial Red `#D322F9`, monospace typography.
- **Drive:** Two ad slots (AdInstruction DTOs), real-time placeholders `[DISTANCE]`, `[TIME_LEFT]`, `[COUPON_CODE]`, red "Activate new ad" CTA.
- **Debug (Admin Room):** Map placeholder with red geofence, stats, Active Ad / Deactivate Ad.

## Stacks

- **Auth:** Login (mock token in SecureStore); redirects to Drive when authenticated.
- **Drive:** Main screen with ad slots, header (time, menu, star, share), adaptive polling for ranked ads.
- **Debug:** Admin Room — map, data rows, stats chart, actions (modal).

## Features

- **Zustand:** `locationStore`, `deviceStore` (BLE hashes), `adStore`, `offlineQueueStore`.
- **Location:** Background/foreground via expo-location; updates `locationStore`; permissions requested on Drive.
- **BLE:** `bleHash()` for device IDs (SHA256-style); use `react-native-ble-plx` for real iBeacon scan and call `deviceStore.addDetectedDevice(hash)`.
- **Offline queue:** MMKV storage helpers in `src/services/offlineQueue.ts`; `impressionSync.ts` for exponential-backoff sync; idempotency via `client_uuid` per impression.
- **Adaptive polling:** 5s when stationary, 60s when moving (use `useAdaptivePolling`).

## Run

```bash
cd apps/mobile-driver
npm install   # if not already
npx expo start
```

Add `assets/icon.png` and `assets/splash.png` (see `assets/README.md`) or run with defaults.

Set `EXPO_PUBLIC_API_URL` to your backend (e.g. `http://localhost:3000`) for ad-selection and context.

## Permissions

- **Background Location:** For location-based ads while driving.
- **Bluetooth (BLE):** For iBeacon scan and `unique_devices_detected` (optional; add native BLE module for real scan).
