# Emergency Alert System & Shelter Navigation

This document describes what was built, how the Shelter and Pikud HaOref integration work, and **how to test and see the system in action**—both when there is **no real alarm** and when there **is** a real alarm.

---

## What Was Built

### 1. Shelter Data (Tel Aviv GIS)

- **Source:** Tel Aviv–Yafo Open Data GIS API (public shelters layer).
- **Backend:** A **Shelter** table in PostgreSQL stores: `id`, `externalId`, `address`, `lat`, `lng`, `lastUpdated`.
- **Sync:** A background job runs **daily at 3:00 AM** and on app startup (if the table is empty). It fetches all shelters from the GIS API and upserts them by `externalId`.
- **API:** You can query shelters near a point and trigger a manual sync (admin only).

### 2. Pikud HaOref (Home Front Command) Alerts

- **Source:** Official Pikud HaOref alert feed: `https://www.oref.org.il/WarningMessages/alert/alerts.json`.
- **Backend:** A **PikudHaorefService** polls this URL every **2 seconds**. When the response contains alert data (e.g. area names like "תל אביב - מרכז העיר"), it:
  - Deduplicates by content hash.
  - Emits an internal event.
  - **EmergencyService** then checks which connected drivers are inside the alert zone (Tel Aviv bounds and area list; see **Why didn’t I get a real alarm?** below). For each matched driver it:
    - Selects a nearby shelter (anti-crowding algorithm within 500 m).
    - Sends a **real-time Socket.io event** `ALERT_ACTIVE` to that driver’s app with shelter address, distance, and direction.

### 3. Emergency Override & Shelter Selection

- **Ad selection:** When an alert is active for the driver’s location, the **EmergencyRulesStrategy** (first in the chain) bypasses the normal ad auction and returns **emergency_data** (shelter + alert headline) instead of ads.
- **Anti-crowding:** Among shelters within 500 m, if several are within 100 m of the closest, one is chosen by **weighted random selection** so users are spread across shelters.
- **Navigation data:** Each response includes distance in meters and bearing/direction (up/down/left/right) for the arrow on the mobile UI.

### 4. Mobile App (Visual Only, No Audio)

- **Socket.io:** The app connects to the backend `/emergency` namespace and sends `register` (driverId + lat/lng) and `updatePosition`. It listens for `ALERT_ACTIVE` and `ALERT_CLEAR`.
- **Emergency overlay:** When `ALERT_ACTIVE` is received (or when the ranked-ad response contains `emergencyData`), a **full-screen red/yellow overlay** appears with:
  - "MISSILE ALERT" / "אזעקת טילים"
  - A large directional arrow toward the shelter
  - Shelter address and **straight-line distance** in meters (updated every second as the user moves). *Note: This is haversine (as-the-crow-flies) distance; Google Maps shows walking/driving distance, so the app may show e.g. 220 m while Maps shows ~400 m.*
- **Offline:** The 5 nearest shelters are cached in MMKV. If the app loses connection during an alert, it can still show the cached nearest shelter.
- **Fallback:** If the socket is disconnected for more than 3 seconds, the app polls `GET /emergency/check?lat=...&lng=...` every 2 seconds until the socket reconnects.

---

## How to Test When There Is **No** Real Alarm

Use these to verify the pipeline without waiting for a real Pikud HaOref alert.

### Prerequisites

- Backend running: `npx nx serve backend-api` (or `pnpm nx serve backend-api`).
- Redis running (required for alert state and driver positions).
- PostgreSQL with migrations applied and at least one shelter sync run (see below).

### 1. Verify Shelter Data

**Count shelters in the DB:**

```http
GET http://localhost:3000/shelters/count
```

If the count is 0, run a manual sync (requires admin key if `ADMIN_API_KEY` is set):

```http
POST http://localhost:3000/shelters/sync
x-admin-api-key: YOUR_ADMIN_API_KEY
```

Or, if `ADMIN_API_KEY` is not set in `.env`, you can call without the header.

**Get shelters near a point (e.g. Tel Aviv):**

```http
GET http://localhost:3000/shelters/nearby?lat=32.08&lng=34.78&radius=500&limit=5
```

You should see a list of shelters with `address`, `lat`, `lng`, `distanceMeters`.

### 2. Check Emergency Status (No Alert)

**In the browser (see alarm at a URL):**

Open **http://localhost:3000/emergency/status-page** in a browser. When no alert: dark page with "No alert". When an alert is active: red page with "ALERT ACTIVE", the headline, and connected driver count. Same state as on the phone.

**JSON (API):**

```http
GET http://localhost:3000/emergency/status
```

Expected when no alert is active:

```json
{
  "alertActive": false,
  "connectedDrivers": 0
}
```

### 3. Check Emergency for a Location (No Alert)

```http
GET http://localhost:3000/emergency/check?lat=32.08&lng=34.78
```

Expected when no alert is active:

```json
{
  "active": false
}
```

### 4. Trigger a **Test** Alert (Simulate an Alarm)

This simulates an alert for Tel Aviv so you can see the full flow **without a real alarm**.

**Trigger test alert (admin only):**

```http
POST http://localhost:3000/emergency/test-alert
Content-Type: application/json
x-admin-api-key: YOUR_ADMIN_API_KEY

{
  "areas": ["תל אביב - מרכז העיר"],
  "headline": "אזעקת טילים - בדיקה"
}
```

If `ADMIN_API_KEY` is not set, omit the header or send an empty body `{}`.

**Windows CMD or PowerShell (single line; no backslash `\` at end or you get "Bad hostname").** If `ADMIN_API_KEY` is set, add `-H "x-admin-api-key: YOUR_ADMIN_API_KEY"`:
```cmd
curl -X POST http://localhost:3000/emergency/test-alert -H "Content-Type: application/json" -d "{\"areas\": [\"תל אביב - מרכז העיר\"], \"headline\": \"אזעקת טילים - בדיקה\"}"
```
To clear the alert:
```cmd
curl -X POST http://localhost:3000/emergency/clear -H "Content-Type: application/json" -d "{}"
```

**What happens:**

1. Backend marks an alert as active and stores it in Redis.
2. Every **connected driver** whose position is inside Tel Aviv bounds receives an `ALERT_ACTIVE` socket event with their **personalized** shelter (address, distance, direction).
3. Any **subsequent** request to `GET /emergency/check?lat=...&lng=...` (with coordinates inside Tel Aviv) returns `active: true` and shelter + alert info.
4. Ad-selection ranked endpoint will return `emergencyData` for that location so the mobile app can show the overlay even if it only uses HTTP.

**Verify status (browser):** Open **http://localhost:3000/emergency/status-page** – you should see a red page with "ALERT ACTIVE" and the headline (same as on the phone).

**Verify status (API):** `GET http://localhost:3000/emergency/status` – you should see `"alertActive": true` and possibly `"connectedDrivers" > 0` if the app is connected.

**Verify check (with Tel Aviv coords):**

```http
GET http://localhost:3000/emergency/check?lat=32.08&lng=34.78
```

You should see something like:

```json
{
  "active": true,
  "shelter": {
    "address": "...",
    "lat": 32.08,
    "lng": 34.78,
    "distanceMeters": 123,
    "bearingDegrees": 45,
    "direction": "right"
  },
  "alert": {
    "headline": "אזעקת טילים - בדיקה",
    "timestamp": "..."
  }
}
```

### 5. Clear the Test Alert

```http
POST http://localhost:3000/emergency/clear
Content-Type: application/json
x-admin-api-key: YOUR_ADMIN_API_KEY
```

Body can be `{}`. After this, `GET /emergency/status` and `GET /emergency/check` should show no active alert.

---

## How to See It in Action (End-to-End)

### Option A: Test Alert + Mobile App (Recommended)

1. **Start backend** (with Redis and DB):
   ```bash
   npx nx serve backend-api
   ```

2. **Ensure shelters are synced:**  
   `GET /shelters/count` – if 0, run `POST /shelters/sync` (with admin key if configured).

3. **Start the mobile app** (Expo) and allow location. Use a **simulator** or a device with location set to **Tel Aviv** (e.g. lat 32.08, lng 34.78).

4. **Trigger a test alert:**
   ```http
   POST http://localhost:3000/emergency/test-alert
   Content-Type: application/json
   {"areas": ["תל אביב - מרכז העיר"], "headline": "אזעקת טילים - בדיקה"}
   ```

5. **Within about 2 seconds** you should see:
   - The app’s emergency overlay (red/yellow, "MISSILE ALERT", arrow, shelter address, distance).
   - The overlay updates distance/direction every second as the “car” moves.

6. **Clear the alert:**  
   `POST http://localhost:3000/emergency/clear`  
   The overlay should disappear.

### Option B: Real Pikud HaOref Alert

When there **is** a real alarm in an area that matches our configured zones (e.g. Tel Aviv):

1. **PikudHaorefService** sees non-empty data from `alerts.json` within 2 seconds.
2. Backend matches the alert areas to the configured region and checks driver positions.
3. Every connected driver **inside the alert zone** gets an `ALERT_ACTIVE` socket event with their chosen shelter.
4. The mobile app shows the same overlay; no extra steps needed.

You cannot reliably “test” a real alarm on demand; you can only run the app in production (or staging) and wait for an actual alert, or use the test-alert flow above.

#### Why didn't I get a real alarm on my phone?

**Real alarm path vs test alarm path:**

| Step | Test alarm (POST /emergency/test-alert) | Real alarm (Pikud HaOref API) |
|------|----------------------------------------|------------------------------|
| 1 | You call the API → backend creates an alert object | Backend polls `https://www.oref.org.il/WarningMessages/alert/alerts.json` every 2 s |
| 2 | Alert is passed to `EmergencyService.handleNewAlert()` | When the API returns **non-empty** data, we parse it and emit the same `handleNewAlert()` |
| 3 | Redis stores alert state; socket sends `ALERT_ACTIVE` to drivers | Same: Redis + socket |

So the **same code** runs after the alert is detected. The difference is **how** the alert is detected: test = you trigger it; real = we must **receive** it from the Pikud HaOref API. If you didn't get a real alarm, one of these is likely:

#### Why don't I get a push notification (popup) when the app is closed or in the background?

The backend sends **Expo push notifications** to all drivers who have registered a push token (and, for offline drivers, either have a recent location in the alert zone or, in show-all-Israel mode, use default coords). If you don't see a popup:

1. **Register the token first**
   - Open the **driver app**, allow **notifications** when prompted, and go to the **main screen** (drawer) so that location is available. The app then calls `POST /drivers/push-token` and registers your Expo push token. If you never open the app or never reach the main screen, no token is stored and no push is sent.
2. **Check backend logs** when you trigger a test alert:
   - **"No drivers with push tokens"** → Open the app once, allow notifications, and stay on the main screen until you see "Push token registered" in the app logs (or retry the test alert after opening the app).
   - **"Sending push to offline drivers"** and **"Push batch completed"** with `sent: 1` → The backend sent the push; if the device still doesn't show it, see (3).
3. **Expo Go vs development build**
   - **Expo Go** may not show push notifications for custom backends or may require the app to be in the foreground. For reliable push when the app is closed or in the background, use a **development build** (e.g. `eas build --profile development`) with FCM (Android) / APNs (iOS) configured.
4. **Test mode**
   - For test alerts to send push to **offline** drivers (app closed), set **`EMERGENCY_SHOW_ALL_ISRAEL_ALERTS=true`** in backend `.env`. Otherwise only drivers with a **recent** last-known location (Redis, ~5 min TTL) in the alert zone get push.

1. **Backend was not running** or was **restarted after the alarm ended**. The API usually clears the alert from the feed within 1–2 minutes, so if the backend was down or restarted later, it never saw the data.
2. **Area filter (before you set EMERGENCY_SHOW_ALL_ISRAEL_ALERTS).** By default we only process alerts whose area is in the Tel Aviv list. An alarm in the **north** would have been ignored unless `EMERGENCY_SHOW_ALL_ISRAEL_ALERTS=true` was set **before** that alarm.
3. **API returned something we don't parse.** Check **http://localhost:3000/emergency/pikud-status** after the next alarm: `lastNonEmptyPreview` shows the raw API response; `lastSchemaError` shows why parsing failed if it did.

**Where to see logs:** In the terminal where you run `npx nx serve backend-api`. Open **http://localhost:3000/emergency/pikud-status** to see last poll time, last error, and last non-empty API response.

**Testing with more real alarms:** set `EMERGENCY_SHOW_ALL_ISRAEL_ALERTS=true` in the backend `.env`. Then any Pikud HaOref alert in Israel is shown to **all** connected drivers. Use only for testing; turn off for production.

### Option C: HTTP-Only (No Socket) Fallback

1. **Trigger test alert** (as in Option A).
2. **Do not** open the mobile app (or disconnect the socket).
3. Call the **ranked ads** endpoint with a Tel Aviv location:
   ```http
   GET http://localhost:3000/ad-selection/ranked?driverId=driver-1&lat=32.08&lng=34.78&geohash=sv8eq&timeHour=12
   ```
4. The first instruction in the response should contain **emergencyData** (shelter, distance, direction, alert headline). So even without Socket.io, the app can show the emergency UI if it uses this endpoint (e.g. in BackgroundDriverLogic when it receives `emergencyData` in the ranked response).

---

## Where to see logs (real alarms)

- **Backend logs:** In the terminal where you run `npx nx serve backend-api`. All Pikud HaOref messages appear there: "Pikud HaOref polling alive", "Pikud HaOref non-empty response", "NEW ALERT DETECTED", or "Pikud HaOref poll error".
- **Pikud status in the browser:** Open **http://localhost:3000/emergency/pikud-status** to see: whether polling is enabled, last poll time, last error (if any), and the last non-empty response from the Pikud HaOref API (so you can see exactly what the API sent when an alarm was active). Use this to debug why a real alarm did not show on the app.

## Summary Table

| Goal                               | What to do                                                                 |
|------------------------------------|----------------------------------------------------------------------------|
| See shelter data                   | `GET /shelters/nearby?lat=32.08&lng=34.78&radius=500`                      |
| Populate shelters                  | `POST /shelters/sync` (admin)                                             |
| Check if any alert is active       | `GET /emergency/status`                                                   |
| **Debug real alarm / see Pikud API**| `GET /emergency/pikud-status`                                             |
| Check alert for a specific location| `GET /emergency/check?lat=32.08&lng=34.78`                                |
| Simulate an alarm                  | `POST /emergency/test-alert` with body `{"areas":["תל אביב - מרכז העיר"], "headline":"..."}` (admin) |
| Clear simulated alarm              | `POST /emergency/clear` (admin)                                           |
| See overlay on device              | Start app with Tel Aviv location → trigger test alert → overlay in ~2 s  |
| Rely on real alarm                 | Deploy and leave app connected; real Pikud HaOref alerts will push same way |

---

## Environment Variables (Relevant)

- **ADMIN_API_KEY** – If set, admin routes (sync, test-alert, clear) require header `x-admin-api-key`.
- **EMERGENCY_MODULE_ENABLED** – Set to `false` to disable Pikud HaOref polling and emergency logic.
- **EMERGENCY_SHOW_ALL_ISRAEL_ALERTS** – Set to `true` (testing only) so **any** Pikud HaOref alert in Israel is shown to **all** connected drivers with shelter for their location, regardless of area/bounds. Default: off (only configured region and driver position are used).
- **PIKUD_HAOREF_POLL_INTERVAL_MS** – Polling interval in ms (default 2000).
- **SHELTER_SEARCH_RADIUS_M** – Radius in meters for shelter search (default 500).

---

## Fixes Applied to Unrelated Failing Tests

Three ad-selection tests were failing because their mocks did not match the actual Redis usage of the services:

1. **budget-pacing.service.spec.ts**  
   The service uses **incrby**, not **incrbyfloat**. The mock was updated to provide `incrby` and the assertion was changed to expect `incrby` to be called.

2. **frequency-cap.service.spec.ts**  
   The service uses **mget** (not **get**) in `filterCapped`. The mock was updated to include `mget` returning `[devCount, areaCount]`, and the tests that check capping now set `mget.mockResolvedValue(...)` accordingly.

3. **share-of-voice.service.spec.ts**  
   The service uses **scan** and **mget** (not **keys** and **get**) in `getSovPenalty`. The mock was updated to use `scan.mockResolvedValue(['0', keys])` and `mget.mockResolvedValue([...])` so the penalty tests get the expected keys and values.

All three test files now align with the implementation and should pass.
