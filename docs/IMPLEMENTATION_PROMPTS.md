# Implementation Prompts (Full Verbatim)

These are the exact prompts to implement. Do them exactly as specified—task by task.

---

## Prompt 1: Context Engine (NestJS)

Implement Context Engine (NestJS).

1. Filtering Logic:
- Cross-reference DriverPreferences with Business:
  - If kosher_only: Filter businesses WHERE certifications->>'kosher' = 'true'.
  - If exclude_alcohol: Filter WHERE serves_alcohol = false. or also if the driver is vegeterian and doesnt want to publish meat
  - Apply language/category exclusions.
2. Rate Limiting (Redis Token Bucket):
- Device limit: 1 request / 5s.
- External API Throttling: api_calls:{geohash}:{service} -> Max 10/min. Serve from cache if exceeded.
- Handle 429 errors with 'retryAfter' response.
3. Heartbeat:
- Update 'car_screens.last_heartbeat' every 2 minutes.
3. External Integrations:
   - Google Places API: Fetch nearby POIs (Points of Interest) based on current lat/lng. 
   - Weather API: Fetch current weather for the specific geohash.
   - Logic: Call these APIs ONLY if the driver has moved > 100m or if the cached data (TTL 10m) has expired.
   - Storage: Map Google Place categories (e.g., 'restaurant', 'gym') to our internal business categories.

---

## Prompt 2: AdSelectionEngine (Strategy Pattern)

Implement AdSelectionEngine using Strategy Pattern.

Chain:
1. EmergencyRulesStrategy: Query active emergency_alerts for driver's location. If alert exists, override everything.
2. ProximityStrategy: If BLE hint 'IMMEDIATE' is received, boost priority of the specific business.
3. PaidPriorityStrategy: Sort by CPM and budget priority.
4. ContextRulesStrategy: Match weather, time, and POI density.

Return ranked AdInstruction metadata.

---

## Prompt 3: AdCreativeService (LLM + Translation)

Build AdCreativeService with LLM (GPT-4o/Gemini) and Translation.

1. Content Generation:
- Style: Short, punchy, Israeli slang.
- Placeholders: [DISTANCE], [TIME_LEFT], [COUPON_CODE].
2. Translation Pipeline:
- Cache translations in Redis: creative_{id}_{lang}.
- Use a Glossary for brand terms (e.g., "Happy Hour").
- Status: New creatives start as 'PENDING' for admin approval.

---

## Prompt 4: Mobile Driver App (React Native + Advanced Logic)

Scaffold apps/mobile-driver (React Native 0.74, Expo Bare).

**Design reference (from app mockups):**
- **Theme:** Dark mode. Background: Deep Graphite (e.g. #1A1C1E). Accent: Industrial Red (e.g. #D322F9). Typography: Roboto Mono. Use a consistent color palette (Deep Graphite variants) and Roboto Mono for all copy.
- **Drive / Ad screens:** Two dark grey rectangular slots per screen, each labeled as an "Active Ad Drive ad" placeholder. These slots are where AdInstruction DTOs are rendered. Below the slots, space for caption or status (e.g. "Below ad is enabled"). A single prominent red CTA button: "Activate new ad" or "Add new ad" for adding or activating ad content. Header: time (e.g. 9:54), app title "Mobile Scaffold" (or product name), back arrow or hamburger, star, share.
- **Admin & UX Strategy / Design highlight screen:** Same dark theme. Sections for "Admin & UX Strategy", "Color Palette" (Deep Graphite, Roboto Mono), and "Ad Display" with the two ad slots and the red "Activate new ad" button. "Design / Highlight" and "Action Highlight" sections emphasize Industrial Red and Roboto Mono for interactive and ad areas.
- **Admin Room (e.g. "Adanim Room" / Debug):** Dark map with a red hexagonal outline for geofence or target area (feeds from locationStore). Below the map: data rows (e.g. location/rate IDs, device status, "Ad Visual", metrics). A red bar or line chart labeled "Stats" (Skait) for impressions, unique devices, or other performance data. Two actions: red "Active Ad" and a secondary "Delete Ad" (or "Deactivate Ad") for ad management and debugging.

1. Integration: Link to 'libs/shared/sdk' and 'libs/shared/dto'.
2. Navigation: Auth, Drive, and Debug stacks.
   - Auth: login/signup (or onboarding) before Drive.
   - Drive: main experience with the two ad slots and "Add new ad" red button as in the design reference.
   - Debug: Admin Room–style screen with map (red geofence), stats chart, and Active Ad / Delete Ad controls.
3. Permissions: Background Location, Bluetooth (BLE), Motion.
4. Rendering: Pure renderer for AdInstruction DTOs in the two ad slots. Implement real-time placeholder replacement (e.g., [DISTANCE], [TIME_LEFT], [COUPON_CODE] with live values and distance updates).

Implement Advanced Mobile Logic:

1. Zustand Stores: locationStore, deviceStore (BLE), adStore, offlineQueueStore.
2. BLE Scanning: Background scan for iBeacons. Hash detected device IDs (SHA256) for 'unique_devices_detected' metric.
3. Offline Queue (MMKV): Store impressions. Sync with exponential backoff. Ensure Idempotency (reuse client_uuid).
4. Battery Optimization: Adaptive polling (5s stationary, 60s fast driving).

---

## Prompt 5: Mock Driver Simulator

Implement Mock Driver Simulator.

- Input: GeoJSON Polyline of a Tel Aviv route.
- Simulation:
  - Emit GPS pings + Mock BLE proximity detection.
  - Verify Redis caching and PostGIS radius queries.
  - Test Idempotency: Send the same impression twice and verify only one record in DB.
  - Verify Emergency Alert overrides.

---


---

## Prompt 7: Admin Dashboard (Next.js)

Build Admin Dashboard (Next.js).

1. Analytics (SQL):
   - OTS Formula: COUNT(DISTINCT lat_hash) * 50 * 0.7.
   - Conversion Rate: (Redemptions / Impressions) * 100.
2. Moderation: Approve/Reject 'PENDING' creatives.
3. Campaign CRUD: Manage Geofences on a Map.

---

## Prompt 8: Payments & Billing

Implement Payments & Billing.

1. Advertisers: Stripe/Tranzila integration for pre-pay.
2. Drivers: Monthly earnings calculation (COUNT(impressions) * 0.05 ILS).
3. Payout Service: Automated summary for driver bank transfers.
