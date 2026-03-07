# Smart DOOH (Adrive) – Complete Architecture, Flow & Technical Reference

This document is the **single source of truth** for what the app is, how it works end-to-end, which technologies it uses, and how each part interacts. It is written for **experienced developers** joining the project and for **investors/stakeholders** who need a clear picture of the product and its technical foundation.

---

## Part 1: What This App Is (Product Overview)

**Smart DOOH (Adrive)** is a **Digital Out-of-Home (DOOH) advertising platform** for moving audiences (e.g. drivers or passengers). Ads are shown on **car screens** (or a phone acting as one) and are **location-based**: the system chooses which ad to show based on where the vehicle is, driver preferences (e.g. kosher-only, no alcohol), nearby businesses, weather, time of day, and advertiser budget (CPM bidding).

**Main value propositions:**

- **Advertisers**: Target by location (geofence), time, and context; pay per impression (CPM); creatives can be moderated before going live.
- **Drivers**: See relevant, preference-filtered ads; earn per impression (e.g. 0.05 ILS per view).
- **Platform**: One backend serves the mobile app, an optional billboard-style display page, and an admin dashboard for campaigns and analytics.

---

## Part 2: High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SMART DOOH PLATFORM                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  CLIENTS                                                                          │
│  ├── Mobile Driver App (Expo / React Native)  ← Driver’s phone = “car screen”    │
│  ├── Display Page (HTML/JS in browser)       ← Optional billboard on TV/tablet   │
│  └── Admin Dashboard (Next.js)                 ← Web UI for campaigns & analytics │
│                                                                                   │
│  BACKEND (single entry point)                                                     │
│  └── Backend API (NestJS + Fastify) on port 3000                                  │
│        ├── Ad selection, context, impressions, payments, admin, display, health   │
│        ├── Uses PostgreSQL (Prisma ORM) for all persistent data                   │
│        └── Uses Redis for cache, rate limiting, “last ad” cache, simulator state  │
│                                                                                   │
│  EXTERNAL SERVICES (optional, with fallbacks)                                     │
│  ├── Google Places API (nearby POIs) – cached 10 min                              │
│  ├── OpenWeatherMap (weather) – cached 10 min                                     │
│  ├── SerpApi or mock (trends for creatives) – cached 1 h                          │
│  ├── OpenAI GPT-4o / Google Gemini (creative generation)                          │
│  ├── Stripe / Tranzila (payments)                                                 │
│  └── Sentry (backend + mobile error tracking)                                     │
│                                                                                   │
│  DEV / TESTING                                                                    │
│  └── Mock Driver Simulator (Node script) – simulates a car on a Tel Aviv route     │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

All clients talk **only** to the **Backend API**. The backend is the only component that talks to PostgreSQL and Redis.

---

## Part 3: Technologies Used (Full Stack)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend runtime** | Node.js 20+ | Runs NestJS server |
| **Backend framework** | NestJS 11 | Modules, DI, guards, pipes, filters |
| **HTTP server** | Fastify | High-performance HTTP (used by NestJS adapter) |
| **Database** | PostgreSQL 14+ | Persistent data (businesses, campaigns, creatives, impressions, drivers, payments) |
| **ORM** | Prisma 5.x | Schema, migrations, type-safe queries |
| **Cache / rate limit** | Redis 6+ (ioredis) | Cache (POI, weather, “last ad”, traffic density), rate limits, simulator position |
| **Mobile app** | React Native 0.81 + Expo 54 | Cross-platform driver app |
| **Mobile routing** | Expo Router 6 | File-based navigation (Auth, Drive, Debug) |
| **Mobile state** | Zustand | Lightweight global state (location, ads, device, offline queue) |
| **Mobile persistence** | MMKV | Fast offline queue for impressions; Expo SecureStore for device ID / auth |
| **Admin UI** | Next.js 14 (App Router) | Analytics, moderation, campaign CRUD |
| **Admin styling** | Tailwind CSS | Utility-first CSS |
| **Validation (backend)** | Zod (+ shared-dto) | Request validation at API boundary |
| **Logging** | Pino (nestjs-pino) | Structured JSON logs; redacts sensitive fields |
| **Metrics** | Prometheus (prom-client) | Latency, cache hits/misses, impressions |
| **Errors** | Sentry | Backend + mobile error tracking |
| **API docs** | Swagger (NestJS) | Served at `/api-docs` |
| **Payments** | Stripe, Tranzila | Advertiser payments; webhooks for Stripe |
| **External APIs** | Google Places, OpenWeatherMap, SerpApi | Context and trends (with caching and rate limits) |
| **LLM** | OpenAI GPT-4o, Google Gemini | Ad creative generation (env-configured, with fallback) |
| **Tunneling (dev)** | ngrok (optional) | Expose local backend to phone over internet; app sends `ngrok-skip-browser-warning` when URL contains “ngrok” |
| **Build / monorepo** | Nx 22 | Workspace, build, and task orchestration |

---

## Part 4: How Each Part Interacts

### 4.1 Mobile Driver App ↔ Backend

- **Auth**: Token stored in Expo SecureStore; validated by backend (e.g. Postgres session/user if used).
- **Location**: App gets GPS (or simulator position from backend). It sends:
  - **Driver location**: `POST /driver/location` every **7 seconds** (driverId, deviceId, lat, lng, geohash).
  - **Heartbeat**: `POST /car-screens/heartbeat` every **2 minutes** (deviceId, driverId).
- **Ads**: App calls `GET /ad-selection/ranked?driverId=...&lat=...&lng=...&geohash=...&timeHour=...` with header `x-device-id`. Backend applies **device rate limit: 2 requests per 6 seconds** per device. App **polls every 6 seconds** (same for real GPS and simulator) and enforces a **minimum 5.5 s** between fetches to avoid 429.
- **Impressions**: When the app shows an ad, it enqueues an impression in the **offline queue (MMKV)**. A sync service **POSTs** to `POST /impressions` with `client_uuid` for **idempotency**. Retries use exponential backoff (max 5 retries).
- **Display mirror**: App can poll `GET /ad-selection/last/:driverId` every **10 seconds** to align with what the billboard display shows and optionally enqueue one impression for balance.
- **Preferences**: Load/save driver preferences (e.g. kosher, no alcohol) via driver-preferences endpoints; these are **exempt** from the ad-selection device rate limit so one tap always works.

### 4.2 Display Page (Billboard) ↔ Backend

- **URL**: `http://<BACKEND_IP>:3000/display/:driverId` (e.g. open on a TV or tablet on the same Wi‑Fi).
- **Behavior**: The page is **static HTML + inline JS** served by the backend. It polls `GET /ad-selection/last/:driverId` every **5 seconds** and renders the first instruction (headline, body, coupon). If no ad is cached, it shows “Mirror – Open the app with this driver…”.
- **Data source**: “Last” result is written by the backend whenever `GET /ad-selection/ranked` or `GET /ad-selection/ranked/:driverId` returns instructions; it is stored in Redis with key `display:last:{driverId}` and TTL **5 minutes**.

### 4.3 Admin Dashboard ↔ Backend

- **Base URL**: Next.js app runs on port **3001**; it calls the backend using `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3000`).
- **Auth**: Optional `x-admin-api-key` (or similar) via `NEXT_PUBLIC_ADMIN_API_KEY`; backend protects admin routes with `AdminApiKeyGuard` when `ADMIN_API_KEY` is set.
- **Endpoints used**: Analytics (OTS, conversion, impressions), creative moderation (approve/reject PENDING), campaign CRUD with geofences (circle or polygon).

### 4.4 Mock Driver Simulator ↔ Backend

- **Run**: From repo root or `apps/mock-driver-simulator`: `npm run run` (or equivalent). Node script, no UI.
- **Behavior**: Loads a GeoJSON route (Tel Aviv). For each point it:
  - Calls `GET /context-engine/context`, `GET /ad-selection/ranked`, `POST /car-screens/heartbeat`, and optionally `POST /impressions`.
  - **POSTs** current position to `POST /simulator/position` (driverId, lat, lng, geohash). Backend stores it in Redis with TTL **60 seconds**.
- **Mobile in simulator mode**: App uses `GET /simulator/position?driverId=sim-driver-1` as its location and polls ad-selection with that position so ads change as the “car” moves.

### 4.5 Backend ↔ PostgreSQL

- **Prisma**: All persistent data. Main entities: Driver, DriverPreferences, Business, Campaign, Creative (with status PENDING/APPROVED/REJECTED), Impression (unique on `clientUuid`), Redemption, CarScreen, EmergencyAlert, Payment, DriverEarnings, Payout, TrafficDensity, LiveEvent, TargetingPreferences.
- **Geofences**: Stored as JSON (circle: lat, lng, radiusMeters; or polygon). In-range check uses haversine (or PostGIS if enabled).

### 4.6 Backend ↔ Redis

- **Cache**: POI (Places) and weather per geohash, TTL **10 min**. “Last” ad per driver for display, TTL **5 min**. Traffic density and driver location (e.g. 5 min).
- **Rate limits**: Device key `ratelimit:device:{deviceId}` → **2 requests / 6 s**. External API key `api_calls:{geohash}:{service}` → **10 requests / min**.
- **Simulator**: Position stored with TTL 60 s.
- **Impressions**: Throttle key to avoid duplicate impressions in a short window (e.g. 15 s).

---

## Part 5: End-to-End Flows (Step by Step)

### 5.1 Driver Opens App and Sees Ads (Real GPS)

1. App starts; reads device ID from SecureStore (or generates and stores it).
2. Requests location permission; gets (lat, lng), computes geohash.
3. **First fetch**: Calls `GET /ad-selection/ranked` with driverId, lat, lng, geohash, timeHour; backend:
   - Loads driver preferences and filters businesses (e.g. kosher-only, no alcohol).
   - Finds campaigns in range (geofence), with APPROVED creatives only.
   - Runs **ad-selection strategy chain**: Emergency → Proximity (BLE) → Paid priority (CPM) → Event boost → Context rules (weather, time, POI).
   - Returns ordered `AdInstruction[]`; caches result in Redis as “last” for display.
4. App shows first two instructions in two slots; for the top ad, enqueues an impression in MMKV and syncs to `POST /impressions` with `client_uuid`.
5. **Every 6 s**: App calls `GET /ad-selection/ranked` again (respecting 5.5 s minimum gap). Every **7 s** sends `POST /driver/location`. Every **2 min** sends `POST /car-screens/heartbeat`.
6. When driver preferences change and are saved, app triggers an immediate ad refresh.

### 5.2 Bidding / Ad Selection (How Ads Are Chosen)

- **No real-time auction**. For each request the backend:
  1. Gets **candidates**: campaigns whose geofence contains (lat, lng), with APPROVED creatives, and whose business passes driver preference filters (and optional alcohol filter).
  2. **EmergencyRulesStrategy**: If an active EmergencyAlert covers (lat, lng), return that as the only instruction (override).
  3. **ProximityStrategy**: If BLE hint (e.g. `bleBusinessId`) is provided, boost that business’s priority (e.g. +1000).
  4. **PaidPriorityStrategy**: Sort candidates by **CPM** (and budget); higher CPM = higher priority.
  5. **EventBoostStrategy**: If a LiveEvent is near (lat, lng), multiply priority by boost factor.
  6. **ContextRulesStrategy**: Adjust by weather, time of day, POI density (e.g. dinner hour, rain).
- Result: ordered list of `AdInstruction` (headline, body, couponCode, campaignId, creativeId, businessId, priority). First instruction is the “winner” for the first slot; second for the second slot (if present).

### 5.3 Impressions and Driver Balance

- **Impression**: One record per “ad shown” to a device/driver at a location. Uniqueness by `client_uuid` (idempotent). Optional throttle in Redis to avoid bursts.
- **Driver balance**: Updated in real time (e.g. per impression using campaign’s `ratePerReach` or a fixed 0.05 ILS per impression). Stored on Driver or computed from impressions.
- **Driver earnings (report)**: `COUNT(impressions) * 0.05 ILS` for a period. Admin can run `POST /payments/admin/generate-earnings` to create DriverEarnings records and later `POST /payments/admin/create-payout` for bank transfers.

### 5.4 Admin: Campaign and Creative Lifecycle

- **Campaign**: Created/updated via admin API with geofence (circle or polygon), CPM, budget. Linked to one Business.
- **Creative**: Created with status PENDING. Only **APPROVED** creatives are included in ad-selection. Admin moderates via PATCH creative status to APPROVED/REJECTED.
- **Analytics**: OTS (e.g. `COUNT(DISTINCT lat_hash) * 50 * 0.7`), conversion rate = redemptions/impressions, total impressions/redemptions.

---

## Part 6: Key Parameters (Summary Table)

| What | Value | Where |
|------|--------|--------|
| Ad-selection device rate limit | 2 req / 6 s | Backend Redis (`ratelimit:device:*`) |
| Mobile ad polling interval | 6 s | `useAdaptivePolling` (INTERVAL_REAL_GPS_MS) |
| Mobile min gap between ad fetches | 5.5 s | BackgroundDriverLogic (MIN_FETCH_INTERVAL_MS) |
| Driver location POST | Every 7 s | BackgroundDriverLogic (DRIVER_LOCATION_INTERVAL_MS) |
| Heartbeat | Every 2 min (120 s) | BackgroundDriverLogic |
| Display page poll (last ad) | Every 5 s | display-html.ts |
| App “last” poll (display sync) | Every 10 s | BackgroundDriverLogic |
| Driver balance poll (mobile) | 15 s | useDriverBalance (BALANCE_POLL_INTERVAL_MS) |
| POI / weather cache TTL | 10 min | places-api, weather-api (600 s) |
| Display “last” cache TTL | 5 min | ad-selection.controller (DISPLAY_LAST_TTL_SEC) |
| Simulator position TTL | 60 s | simulator.controller |
| External API rate limit | 10 req / min per geohash:service | Redis `api_calls:*` |
| Driver earnings per impression | 0.05 ILS | payments.service (calculateDriverEarnings) |
| Translation cache (creatives) | 24 h | ad-creative.service |

---

## Part 7: Docs vs Code (Consistency Check)

- **IMPLEMENTATION_STATUS.md** says “Adaptive polling (5s stationary, 60s driving)”. **Code** uses a **single 6 s** interval for both (to stay under the 2 req/6s device limit). The “5s/60s” wording is outdated; the current behavior is **6 s** for ad polling.
- **DRIVER_PREFERENCE_FILTERING.md** describes filtering with names like `pref_veganOnly`, `is_vegan`. The **Prisma schema** uses enums: **BusinessTag** (e.g. RESTAURANT, SERVES_ALCOHOL, KOSHER, VEGAN, VEGETARIAN, GAMBLING) and **PreferenceFilter** (e.g. NO_ALCOHOL, KOSHER_ONLY, VEGAN_ONLY). The **logic** (vegan-only, kosher-only, no alcohol, etc.) matches; only the field names in the doc are legacy.
- **RUN_BACKEND_AND_SEE_ADS.md**, **QUICK_START_GUIDE.md**, **ARCHITECTURE_AND_FLOW.md**, and **IMPLEMENTATION_VERIFICATION.md** align with the codebase (backend, mobile, simulator, display, Redis, Postgres).

---

## Part 8: ngrok and Frontend (Mobile) Access

- **Problem**: When the backend is exposed via **ngrok** (e.g. for testing on cellular), ngrok’s browser warning page can return **HTML** instead of JSON for API calls, which breaks the app.
- **Solution**: The mobile **apiClient** checks if `EXPO_PUBLIC_API_URL` contains `"ngrok"`. If so, it adds the header **`ngrok-skip-browser-warning: 1`** to all requests so ngrok forwards to the backend and returns JSON.
- **Display page**: Loaded in a browser; uses `window.location.origin` as API base. If the display URL is the ngrok URL, the same header can be added in the display script if needed (currently the display fetches from the same origin).

---

## Part 9: File Layout (Where to Look)

- **Backend**: `apps/backend-api/src/` — `app.module.ts`, `main.ts`, and feature folders: `ad-selection/`, `context-engine/`, `impressions/`, `car-screen/`, `driver/`, `payments/`, `admin/`, `display/`, `simulator/`, `health/`, `observability/`, `config/`, `core/`, `prisma/`, `redis/`, `rate-limit/`, `external-api/`, `ad-creative/`, `traffic-density/`, `impression-estimator/`.
- **Mobile**: `apps/mobile-driver/src/` — `app/` (Expo Router screens), `components/` (e.g. BackgroundDriverLogic), `stores/`, `hooks/`, `services/` (apiClient, impressionSync, offlineQueue, locationService), `theme/`.
- **Admin**: `apps/admin-dashboard/` — Next.js App Router pages and components.
- **Simulator**: `apps/mock-driver-simulator/` — Node script and route GeoJSON.
- **Shared**: `libs/shared-dto/` (if present) for Zod schemas and DTOs used by backend (and optionally mobile).
- **Schema / DB**: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.

---

## Part 10: For Investors and Non-Engineers

- **What it does**: Shows the right ad to the right driver at the right place and time, respecting preferences and advertiser budget, and tracks views (impressions) and optional redemptions (coupons).
- **How it does it**: One backend coordinates everything; the driver’s phone (or a display) shows ads; the backend decides which ad using location, preferences, weather, time, and CPM; impressions are counted and can be used for driver earnings and advertiser reporting.
- **Scalability**: Backend is stateless (state in Postgres and Redis); can add more API instances behind a load balancer; Redis and Postgres can be scaled independently.
- **Revenue**: Advertisers pay per campaign (CPM/budget); drivers earn per impression (e.g. 0.05 ILS); platform can take a margin or fee on either side depending on business model.

---

**Document version**: Based on codebase and docs as of March 2026. For runbooks and day-to-day commands, see README.md, QUICK_START_GUIDE.md, and docs in `docs/`.
