# Architecture and flow – what runs where and what it’s for

This doc explains what each part of the platform does, what **Postgres** and **Redis** are for, and how the **simulator** fits in.

---

## The big picture

| Component | What it is | What it’s for |
|-----------|------------|----------------|
| **Backend API** | NestJS server (port 3000) | Serves ads, stores/reads data, runs business logic. Uses **Postgres** (persistent data) and **Redis** (cache + rate limit + simulator position). |
| **Postgres** | PostgreSQL database | Stores all persistent data: businesses, campaigns, creatives, impressions, redemptions, drivers, emergency alerts, payments. The backend reads/writes here. |
| **Redis** | In-memory store | Used by the backend for: caching (e.g. context), rate limiting (devices), and **simulator position** (so the phone can read the current “car” position). |
| **Admin dashboard** | Next.js web app (port 3001) | **Web UI for admins**: view analytics, approve/reject creatives, create/edit/delete campaigns and geofences. Talks to the backend `/admin/*` APIs. |
| **Mobile app (driver)** | React Native / Expo app on your phone | **Driver/car screen**: shows ads based on location (GPS or simulator). Calls backend for ad-selection, heartbeat, and (in simulator mode) current simulated position. |
| **Mock driver simulator** | Node.js script (run on your PC) | **Simulates a car** driving the Tel Aviv route: for each point it calls the backend (context, ad-selection, heartbeat) and **posts the current position** to the backend. When the phone is in “simulator mode”, it reads that position and shows ads for it. |

---

## What is Postgres used for?

**Postgres** is the main database. The backend uses it (via Prisma) for everything that must **persist**:

- **Businesses** – e.g. “Tel Aviv Café” (name, tags, categories, language). One business can have **many campaigns**.
- **Campaigns** – ad campaigns (budget, geofence, active flag). Each campaign belongs to one business and can have **many creatives**.
- **Creatives** – the actual ad content (headline, body, image, coupon, status: PENDING / APPROVED / REJECTED). What you see in the simulator (e.g. “50% off fashion week”) is a **creative** from a **campaign**; the campaign’s **business** might be one of the 4 seeded businesses or another business created via the admin. So “4 businesses, 9 campaigns” is normal: some businesses have multiple campaigns (e.g. different promos or geofences).
- **Impressions** – when an ad was shown (to whom, where, which campaign/creative)
- **Redemptions** – when someone used a coupon (conversion)
- **Drivers** and **DriverPreferences** – e.g. kosher-only, exclude alcohol
- **CarScreen** – devices (phone/tablet) and their last heartbeat
- **EmergencyAlert** – e.g. “Emergency at this location” (overrides normal ads)
- **Payments / Payouts / DriverEarnings** – billing and driver payouts

So: **no Postgres = no businesses, no campaigns, no creatives, no ads.** The backend must have a valid `DATABASE_URL` (Postgres) to run properly.

---

## What is Redis used for?

**Redis** is used by the backend for things that are **temporary** or **fast lookup**:

- **Caching** – e.g. context (POIs, weather) so the same location isn’t recomputed every time
- **Rate limiting** – per-device limits (e.g. one ad request per 5 seconds)
- **Simulator position** – the mock-driver-simulator posts `{ driverId, lat, lng, geohash }`; the backend stores it in Redis with a short TTL; the phone in simulator mode reads it via `GET /simulator/position`

If Redis is down, the backend may still start but caching, rate limiting, and simulator position won’t work correctly.

---

## What is “cd apps/mock-driver-simulator && npm run run” for?

That command **runs the mock driver simulator** on your PC. It:

1. Loads the **Tel Aviv route** (GeoJSON: a list of coordinates).
2. For **each point** on the route, in order:
   - Calls the backend: context, ad-selection, heartbeat (so the backend “sees” a driver at that location).
   - **POSTs the current position** to `POST /simulator/position` (driverId, lat, lng, geohash) so the backend (Redis) holds the “current” simulated position.
3. Then it continues with its other checks (Redis cache, idempotency, emergency override).

So:

- **Backend** = always running, serves API.
- **Simulator** = a **script you run when you want** to simulate a car driving that route. While it runs, it keeps updating the backend with the current point. If the **phone app is in simulator mode**, it polls `GET /simulator/position` and uses that position to request ads – so **the ads on the phone change as the “car” moves** along the route.

So: **“npm run run”** = start the script that simulates the drive and updates the backend so the phone can follow that drive in simulator mode.

---

## End-to-end flow (how it fits together)

### 1. Backend (and DB + Redis)

- You run: **Postgres** (database), **Redis** (cache + simulator position), and the **backend API** (e.g. `npx nx serve backend-api` with `NODE_PATH=dist`).
- The backend uses **Postgres** for all persistent data and **Redis** for cache, rate limit, and simulator position.
- It exposes APIs: ad-selection, context, impressions, admin, simulator position, etc.

### 2. Admin dashboard (optional, for managing ads)

- You run the **admin dashboard** (Next.js) on port 3001.
- It’s a **web UI** for admins: analytics, creative moderation (approve/reject), campaign CRUD and geofences.
- It only talks to the **backend** (`/admin/*`). It does **not** talk to Postgres or Redis directly; the backend does that.

### 3. Mobile app (driver / car screen)

- The **phone** runs the Adrive app (Expo / React Native).
- It gets **location** either from:
  - **GPS** (if permission granted), or  
  - **Fallback** (fixed Tel Aviv) if permission denied, or  
  - **Simulator mode**: it polls the backend `GET /simulator/position?driverId=sim-driver-1` and uses that as its location.
- With that location it calls the backend **ad-selection/ranked** and shows the returned ads in the two slots. It also sends heartbeats to the backend.

### 4. Mock driver simulator (when you want a “driving car” in Tel Aviv)

- You run on your **PC**: `cd apps/mock-driver-simulator && npm run run`.
- The script walks the Tel Aviv route and, for each point:
  - Calls the backend (context, ad-selection, heartbeat).
  - **POSTs** the current position to the backend so Redis has the “current” simulated position.
- If the **phone is in simulator mode**, it uses that position for ad requests, so **ads on the phone change as the simulated car moves**.

---

## Summary table

| You run | Purpose |
|--------|--------|
| **Postgres** | Persistent DB for businesses, campaigns, creatives, impressions, etc. Backend needs it. |
| **Redis** | Cache, rate limit, simulator position. Backend needs it for full behavior. |
| **Backend API** | Serves all APIs; uses Postgres + Redis. |
| **Admin dashboard** | Web UI to manage campaigns, creatives, analytics (talks to backend). |
| **Mobile app** | Driver/car screen: shows ads by location (GPS, fallback, or simulator position). |
| **mock-driver-simulator** (`npm run run`) | Simulates a car on the Tel Aviv route and updates the backend with the current position so the phone (in simulator mode) can show ads that change along the route. |

So: **Backend + Redis + Postgres** are the core. **Admin dashboard** is for managing ads. **Simulator script** is what “drives” the car and updates the position the phone uses in simulator mode.
