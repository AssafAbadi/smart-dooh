# Mock Driver Simulator (Prompt 5)

Simulates a driver along a **Tel Aviv route** (GeoJSON polyline): emits GPS pings, mock BLE, and calls backend APIs. Verifies Redis caching, idempotent impressions, and emergency alert overrides.

## Prerequisites

- Backend API running (`API_BASE`, default `http://localhost:3000`)
- Redis and PostgreSQL with migrations applied
- Optional: run `npx prisma db seed` from repo root to seed an **EmergencyAlert** at the first route point (so the emergency-override check passes)

## Run

From repo root:

```bash
cd apps/mock-driver-simulator
npm install
npm run run
```

Or with env:

```bash
API_BASE=http://localhost:3000 DRIVER_ID=sim-driver-1 npm run run
```

## What it does

1. **GPS + Mock BLE**  
   Loads `data/tel-aviv-route.json` (GeoJSON LineString). For each point:
   - Calls `GET /context-engine/context` (driverId, deviceId, lat, lng, geohash)
   - Calls `GET /ad-selection/ranked` (driverId, lat, lng, geohash, timeHour)
   - Calls `POST /car-screens/heartbeat` (deviceId, driverId)  
   Respects device rate limit (1 req/5s) with a 6.2s delay between rate-limited calls.

2. **Redis caching**  
   Calls context twice at the **same** position. Second call should be served from cache (same response shape, no extra external API calls).

3. **Idempotency**  
   POSTs the **same** impression (same `client_uuid`) twice to `POST /impressions`, then `GET /impressions/count?client_uuid=...`. Asserts count is **1**.

4. **Emergency override**  
   At the first route point, calls ad-selection. If an active **EmergencyAlert** exists in DB for that location (e.g. after `npx prisma db seed`), the simulator asserts that one of the returned instructions has `campaignId === 'emergency'`. **Emergency always wins**: ad-selection runs the emergency strategy first, so at that point you will see "Simulator test alert / Emergency override" instead of normal or filtered ads.

### Testing ad filters (vegan, kosher, etc.)

If you set "Vegan only" (or other filters) in the app and run the simulator but still see the emergency alert, it’s because an **active EmergencyAlert** at the first route point overrides all other ads. To see filtered ads in the simulator:

- Re-seed with the emergency alert **inactive**:  
  `SEED_EMERGENCY_ALERT_ACTIVE=false npx prisma db seed`  
  Then run the simulator again; you should get normal (vegan-only, etc.) ads at the first point instead of the emergency message.

## Route data

- `data/tel-aviv-route.json`: GeoJSON Feature with LineString (Rothschild to Dizengoff area). Coordinates are `[lng, lat]`.

## PostGIS / radius

Backend uses **haversine** in app code for emergency-alert radius, not PostGIS. The simulator verifies that radius-based logic (emergency alerts) works by checking that when the driver is inside an alert’s circle, ad-selection returns the emergency instruction.
