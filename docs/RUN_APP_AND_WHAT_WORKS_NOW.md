# How to run the app & what actually works now

## How to run the app

### Backend (already running)

- **Database**: Migrations are applied. If you ever reset DB, run:
  - `npx prisma migrate deploy`
  - `npx prisma generate` (if you get a file lock, stop the backend first)
  - `npx prisma db seed`
- **Backend**: Runs on port 3000.
  - Start: `npx nx serve backend-api` (from repo root).
  - If something is already on 3000: `netstat -ano | findstr ":3000"` then `taskkill /PID <pid> /F`, then start again.
- **Redis**: Optional. If `REDIS_URL` is not set, cache and frequency-throttle are skipped; ads and selection still work.

### Mobile (driver app)

1. In `apps/mobile-driver/.env` set `EXPO_PUBLIC_API_URL` to your backend:
   - Same machine: `http://localhost:3000` (Expo Go on same PC) or `http://<your-PC-IP>:3000` (phone on same WiFi).
   - Example: `EXPO_PUBLIC_API_URL=http://192.168.1.205:3000` (replace with your PC’s IP from `ipconfig`).
2. From repo root: `npx nx serve mobile-driver` or `cd apps/mobile-driver && npx expo start`.
3. Open in Expo Go; grant location (or use the **simulator** to drive a route from the web simulator).

### Simulator (optional)

- Web simulator drives a fixed route and sends position to the backend; use it to see ads change by location without moving your phone.
- Run backend + simulator as documented in the repo; mobile can use `sim-driver-1` when in simulator mode so the same route is used.

---

## What actually works now (no “future” promises)

### 1. Ad selection (what the driver sees)

- **Works**: The app asks the backend for “ranked” ads: `GET /ad-selection/ranked` with `driverId`, `lat`, `lng`, `geohash`, `timeHour`.
- **Backend**:
  - Loads **businesses** and **driver preferences** from the DB (kosher, no alcohol, vegan, etc.) and filters which businesses can see ads.
  - Loads **campaigns/creatives** in range by **geofence** (circle around lat/lng); only campaigns whose geofence contains the position are candidates.
  - Runs a **strategy chain**: emergency override → proximity (BLE) → paid priority (CPM/budget) → **event boost** → **context rules** (weather + time + POI density).
  - Returns an ordered list of “instructions” (headline, body, coupon, businessId, priority). The **mobile app shows the first one** as the “current ad” and uses placeholders like `[DISTANCE]`, `[TIME_LEFT]`, `[COUPON_CODE]` (currently filled with simple defaults like `300m`, `45 min`).
- So **what works now**: Real-time choice of **which pre-made ad** to show based on location, driver prefs, CPM, geofence, and (if configured) weather and live events. No LLM is used in this path.

### 2. Weather (real or off)

- **Real weather**: If you set `OPENWEATHERMAP_API_KEY` (or `WEATHER_API_KEY`) in `.env`, the backend calls **OpenWeatherMap** for the driver’s location (with cache and rate limit). That weather is used **only inside ad selection**: e.g. “rain” can boost soup/coffee-style creatives (via context rules). The **driver app UI does not show a weather widget**; weather is used only to rank ads.
- **No key**: Weather is `null`; ad selection still runs, but no weather-based boosting.

### 3. Google Places (POIs)

- **Real Places**: If you set `GOOGLE_PLACES_API_KEY`, the backend can call **Google Places (searchNearby)**. This is used in **context-engine** for `getContextWithIntegrations` (POIs near the driver). That API is **not** used in the **ranked** ad-selection path that the mobile app calls. So today the driver app does **not** display “nearby POIs” from Google; the context-engine is the foundation for that. Places could be used later by admin or other flows.
- **No key**: POI list is empty where that API would be used.

### 4. “Trendy events” and LLM

- **We do not “scan trendy events” and have the LLM make ads from them in real time.** Here’s what actually exists:
  - **Live events (event boost)**  
    - Stored in the **DB** only: table `LiveEvent` (name, lat, lng, radius, boostFactor, expiresAt). There is **no** automatic scan of external event APIs. The seed **does not** insert any `LiveEvent` rows, so by default the event boost is 1.0 everywhere. If you add rows (e.g. Bloomfield Stadium), then when the driver is inside that circle, ad priority is multiplied by that boost.
  - **Trends + LLM (generate-from-trend)**  
    - Used only for **creating** ad copy, not for what the driver sees in real time. When an admin (or API client) calls **POST /ad-creative/generate-from-trend** with region, campaign, business, distance, coupon, time left, etc.:
    - **Trends**: Backend uses **SerpApi Google Trends** if `SERPAPI_API_KEY` is set; otherwise it uses **mock** Israel/global trends (e.g. “PM loves pizza”, “Happy Hour”).
    - **LLM**: Backend calls **OpenAI (GPT-4o)** or **Gemini** (if `OPENAI_API_KEY` or `GEMINI_API_KEY` is set) to generate **one** headline + body that ties the trend to the business. That result is saved as a **new creative** (status PENDING) for admin approval. So the LLM is used to **generate** creatives that can later be approved and then shown by the normal ad-selection flow; the driver app never talks to the LLM.
- **Summary**: Real-time driver experience is “pre-made ads chosen by location/prefs/weather/events”. “Trends + LLM” is a **tool to create** those ads, not to change them live on the device.

### 5. Impressions and driver balance

- **Works**: When the app sends an impression (e.g. after showing an ad), the backend records it (with frequency cap: same driver/campaign/geohash within 15s is throttled). Estimated “reach” is computed (using time band, speed, optional **live-event** boost from DB); campaign `ratePerReach` is applied and the driver’s balance is incremented. So **real** impression accounting and **real** balance updates work now.

### 6. Driver preferences and context

- **Works**: The app can get/update driver preferences (e.g. kosher, no alcohol) via the context-engine endpoints. Those preferences are what ad selection uses to filter businesses and rank ads. No LLM here.

### 7. Summary table

| Feature | Works now? | Notes |
|--------|------------|--------|
| Ad selection (which ad to show) | Yes | Geofence, CPM, driver prefs, weather (if key set), DB live events (if you add rows). |
| Real weather in ad selection | Yes (if key set) | OpenWeatherMap; used only to rank ads, not shown in UI. |
| Real Google Places | Foundation only | Used in context-engine, not in the ranked call the app uses. |
| “Scan trendy events” → LLM ads | No | Events = DB only (no auto scan). LLM = only for generating new creatives (generate-from-trend), not for live ads. |
| LLM in driver flow | No | Driver only gets pre-made creatives; LLM is for admin creative generation. |
| Trends (SerpApi) in driver flow | No | Only used when calling generate-from-trend (admin flow). |
| Impressions & driver balance | Yes | With 15s frequency cap and reach-based revenue. |
| Live events (DB) | Yes | Add `LiveEvent` rows to get priority boost near venues; seed does not add any. |

You can run the app with the backend and DB as above; set API keys only if you want real weather or future use of Places/trends/LLM in the admin flows.
