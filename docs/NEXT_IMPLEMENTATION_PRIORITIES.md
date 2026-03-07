# Next Implementation Priorities

**Date:** February 2026  
**Context:** All 8 core tasks from the initial plan are done. This doc analyzes what exists, what’s missing or weak, and suggests what to implement next.

---

## 1. Current state (what you have)

| Area | Status | Notes |
|------|--------|--------|
| **Backend** | ✅ Complete | Context engine, ad-selection (strategies), impressions + revenue + throttle, traffic density, driver balance, payments (Stripe/Tranzila), admin API, simulator position, observability (Pino, Prometheus, Sentry). |
| **Mobile driver app** | ✅ Core complete | Home (ads + balance), Earnings, Preferences (filters), Account, Settings, Messages, Developer; simulator mode; impression recording + sync; balance polling. |
| **Admin dashboard** | ✅ Core complete | Analytics (OTS, conversion), Creative moderation (approve/reject), Campaign CRUD + geofence (data only, no map). |
| **Mock simulator** | ✅ Complete | Route, context, ranked, impressions per point, idempotency, emergency check. |
| **Driver earnings / balance** | ✅ Working | Balance by driver, location-based revenue (density + time), throttle per location. |

---

## 2. Gaps and “future” items (from your plan & audits)

### From IMPLEMENTATION_VERIFICATION & IMPLEMENTATION_STATUS

- **Map in admin:** Geofence CRUD exists; **no visual map** (e.g. Mapbox/Leaflet) to draw or view circles/polygons.
- **BLE:** Placeholder hash only; **real BLE** would need `react-native-ble-plx` and iBeacon scanning.
- **Push notifications:** Not implemented (e.g. earnings ready, emergency alerts).
- **A/B testing:** Creative variant support in schema; **logic not implemented**.
- **Real-time:** No WebSocket; ads refresh via polling only.
- **Advanced analytics:** No heatmaps, driver performance reports yet.
- **API docs:** No Swagger/OpenAPI.
- **Grafana:** Metrics exposed; no dashboards/alerts defined.

### From TECHNICAL_DEBT_REPORT

- **Live events:** `LiveEvent` model exists; estimator has `getBoostForLocation` but **no seed or admin UI** to create events (e.g. Bloomfield Stadium boost).
- **Driver earnings formula:** Doc said `COUNT(impressions) * 0.05`; actual revenue is **estimatedReach × ratePerReach** (location/time aware). Ensure docs and any “earnings report” text match this.
- **Validation:** Many controllers still without Zod at boundary; PaymentsService / AdCreativeService use Prisma directly (no repository).
- **Morning rush:** Comment says 07:30–09:30; code uses hours 7 and 8 only (9 not included).
- **Israel timezone:** Revenue uses server UTC; estimation bands are Israeli – consider `Asia/Jerusalem` for consistency.

---

## 3. Recommended order to implement next

Priorities are chosen for **user-visible value** and **foundation for later work**.

### Tier 1 – High impact, clear scope

1. **Admin: map for geofences**  
   - **Why:** Campaigns already have geofence (circle/polygon); creating/editing by numbers only is error-prone.  
   - **What:** Add a map (e.g. Leaflet or Mapbox) on campaign create/edit: show circle/polygon, drag to resize, click to place. Save existing `geofence` JSON.  
   - **Depends on:** Nothing. Uses existing API and schema.

2. **Live events (admin + backend)**  
   - **Why:** “Hot” locations (e.g. stadium on match day) are in the plan; schema and estimator hook exist.  
   - **What:**  
     - Admin: simple CRUD page (name, lat, lng, radius, boost factor, expiry).  
     - Backend: ensure `LiveEventRepository.getBoostForLocation` is used in impression estimator (already wired in code; verify and add seed for one event).  
   - **Depends on:** Nothing. Quick win for location-based revenue.

3. **Earnings screen: match real formula + history**  
   - **Why:** Driver sees balance; earnings screen should show **how** they earned (per period, per campaign or at least totals) and use the same **estimatedReach × ratePerReach** logic as backend.  
   - **What:**  
     - Backend: ensure `GET /payments/driver-earnings/:driverId` (or similar) returns period breakdown and uses same revenue model as impressions.  
     - Mobile: Earnings screen shows history (e.g. by week/month), total earned, and optionally “earned this period” breakdown.  
   - **Depends on:** Nothing. Improves trust and clarity.

### Tier 2 – Product polish

4. **Push notifications (mobile)**  
   - **Why:** Listed in “Future enhancements”: earnings ready, emergency alerts.  
   - **What:** Expo Notifications or FCM; backend endpoint to “mark payout sent” or “broadcast emergency”; mobile subscribes and shows local notifications.  
   - **Depends on:** Optional: small backend hooks for “payout completed” / “emergency created”.

5. **Israel timezone for revenue**  
   - **Why:** Estimation bands (rush, weekend night) are Israeli; server UTC can shift “peak” by 2 hours.  
   - **What:** In impression flow, compute `dayOfWeek` / `hour` (and minute if needed) in `Asia/Jerusalem` before calling the estimator.  
   - **Depends on:** Nothing. Small, contained change.

6. **Morning rush 09:00–09:59**  
   - **Why:** Technical debt: comment says 07:30–09:30; code only 7 and 8.  
   - **What:** In `estimation-factors.util.ts`, include hour 9 (and optionally minute ≤ 30 for 09:30) in morning rush multiplier.  
   - **Depends on:** Nothing.

### Tier 3 – Scale and quality

7. **Zod + DTOs at API boundary**  
   - **Why:** Technical debt: many controllers without shared Zod schemas; validation inconsistent.  
   - **What:** Use existing `rankedQuerySchema` / `contextQuerySchema` in controllers; add Zod for admin, payments, simulator, car-screen, ad-creative where missing.  
   - **Depends on:** None. Can be done incrementally per module.

8. **Repositories for Payments & AdCreative**  
   - **Why:** Align with “no Prisma in services” and rest of codebase.  
   - **What:** Move DB access from PaymentsService and AdCreativeService into repositories; services only orchestrate.  
   - **Depends on:** None.

9. **API documentation (Swagger/OpenAPI)**  
   - **Why:** Easier onboarding and integration.  
   - **What:** Add `@nestjs/swagger`, decorate DTOs and endpoints, serve `/api` or `/docs`.  
   - **Depends on:** Cleaner DTOs (Tier 3 #7) help.

10. **Grafana dashboards + alerts**  
    - **Why:** Metrics already exposed; need visibility and alerts.  
    - **What:** Define dashboards (ad-selection latency, cache hit ratio, impressions per campaign); alerts (e.g. latency > X, cache hit < Y).  
    - **Depends on:** Prometheus + Grafana setup (ops).

---

## 4. Suggested “start here” (this week)

- **Option A – Product:** **Admin map for geofences**  
  - One clear feature; improves campaign creation immediately; no backend schema change.

- **Option B – Revenue clarity:** **Live events admin + seed**  
  - Small backend + one admin page; makes “hot” locations (events) visible and testable.

- **Option C – Driver trust:** **Earnings screen with real formula + history**  
  - Backend earnings API aligned with impressions revenue; mobile Earnings screen with periods and totals.

Pick one of A/B/C based on whether you care most right now about **campaign UX (map)**, **revenue features (events)**, or **driver transparency (earnings)**. After that, add **Israel timezone** and **morning rush fix** as quick follow-ups.

---

## 5. Summary table

| Priority | Item | Effort (rough) | Impact |
|----------|------|----------------|--------|
| 1 | Admin map for geofences | Medium | High (campaign UX) |
| 2 | Live events (admin CRUD + seed) | Small | Medium (revenue feature) |
| 3 | Earnings screen: formula + history | Small–Medium | High (driver trust) |
| 4 | Push notifications | Medium | Medium (engagement) |
| 5 | Israel timezone for revenue | Small | Medium (correctness) |
| 6 | Morning rush 09:00–09:59 | Small | Low (consistency) |
| 7 | Zod at API boundary | Medium (incremental) | Medium (quality) |
| 8 | Repositories for Payments/AdCreative | Small–Medium | Low (consistency) |
| 9 | Swagger/OpenAPI | Small–Medium | Medium (dev UX) |
| 10 | Grafana dashboards/alerts | Medium | Medium (ops) |

---

*This doc can be updated as you complete items or change product priorities.*
