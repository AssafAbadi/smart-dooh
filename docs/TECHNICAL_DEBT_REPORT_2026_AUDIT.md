# Technical Debt Report: 2026 Standards & Logic Consistency Audit

**Date:** 2026-02-08  
**Scope:** Backend API static analysis after refactor. No fixes applied; violations listed for approval.

---

## 1. Architecture & Layering

### 1.1 Controllers: DTO for input and serialized response

| Location | Violation |
|----------|-----------|
| **ad-selection.controller.ts** | GET `ranked`: uses raw `@Query()` params and manual parsing/validation; no Zod DTO. POST `select`: body typed as `Partial<SelectionInput> & {...}` with manual validation; no Zod schema at boundary. |
| **context-engine.controller.ts** | GET `businesses/driver/:driverId` and GET `driver-preferences/:driverId`: path params not validated with Zod. GET `context`: query params (driverId, deviceId, lat, lng, geohash) parsed manually; `contextQuerySchema` exists in libs/shared/dto but is **not used**. |
| **admin.controller.ts** | No Zod for any endpoint. Bodies and query params use inline types and manual `BadRequestException` (e.g. createCampaign, updateCampaign, listCreatives, createRedemption). |
| **payments.controller.ts** | All endpoints use inline body types and manual validation; no shared Zod schemas. |
| **payments/webhooks.controller.ts** | No DTO for Stripe webhook body; constructor reads `process.env` directly. |
| **simulator.controller.ts** | POST `position` and GET `position`: body/query not validated with Zod; manual checks only. |
| **ad-creative.controller.ts** | POST `generate-from-trend`: body uses `GenerateFromTrendParams` (service type); no Zod. GET `translated/:creativeId`: query `lang` not validated with Zod. |
| **car-screen.controller.ts** | POST `heartbeat`: body fields validated manually; no Zod DTO. |
| **context.controller.ts** | POST `snapshot`: body is `unknown`; validation is done inside ContextService via `contextSnapshotSafeParse` instead of at controller boundary with a pipe. |
| **health.controller.ts** | Uses `console.warn` in `ready()` instead of Nest Logger (minor). |

**Serialized response:** Controllers generally return plain objects (`{ instructions }`, `{ ok: true }`, etc.). No formal response DTOs/serialization layer; acceptable if intentional.

### 1.2 Controllers handling business logic

| Location | Violation |
|----------|-----------|
| **ad-selection.controller.ts** | `getRanked` and `postSelect` contain orchestration that could be in a facade: fetching businesses + prefs, applying alcohol filter, building candidates, building context, calling engine. Helpers `applyAlcoholFilter` and `buildRankedContext` are private but the controller still does parsing, filtering, and candidate building (e.g. `allowedBusinessIds`, `candidates = candidates.filter(...)`). Plan Phase 8 thinned the controller but some logic remains. |

### 1.3 Services vs. Repositories: zero Prisma in services

| Location | Violation |
|----------|-----------|
| **payments.service.ts** | Uses `this.prisma` for: `payment.create`, `payment.update`, `payment.findUnique`, `campaign.update`, `impression.count`, `impression.findMany`, `driverEarnings.findUnique`, `driverEarnings.create`, `payout.create`, `payout.findMany`, `driver.findUnique`. All DB access should be moved to dedicated repository(ies). |
| **ad-creative.service.ts** | Uses `this.prisma.creative.create` and `this.prisma.creative.findUnique` directly. Should use a CreativeRepository (or existing admin creative repo extended) for all DB access. |

Repositories (TrafficDensity, Campaign, Driver, Impressions, Business, DriverPreferences, Admin*, CarScreen, CampaignCreative, EmergencyAlert) correctly use Prisma. **ImpressionsService** and **AdminService** use only repositories.

### 1.4 Module isolation

- **Circular dependencies:** No circular module imports detected (e.g. AdSelectionModule → ContextEngineModule; ContextEngineModule does not import AdSelection).
- **Exports:** Modules export what is needed (e.g. ContextEngineModule exports ContextEngineService; ImpressionsModule exports ImpressionsService). ObservabilityModule is `@Global()` and exports MetricsService—reasonable for cross-cutting concern.

---

## 2. Validation & Security (Zod)

### 2.1 Zod schema coverage at boundary

| Finding | Detail |
|--------|--------|
| **Shared DTOs exist but are unused** | `rankedQuerySchema` / `RankedQueryDto` and `contextQuerySchema` / `ContextQueryDto` exist in `libs/shared/dto` and are exported from index, but **ad-selection.controller** and **context-engine.controller** do not use them (no `ZodValidationPipe` with these schemas for GET ranked / GET context). |
| **Missing Zod schemas** | No shared Zod schemas for: admin (campaign CRUD, creative list/status, redemption body), payments (create-intent, complete, driver balance, earnings, generate-earnings, create-payout, payout-summary), webhooks (Stripe event), simulator (position body/query), ad-creative (generate-from-trend, translated query), car-screen (heartbeat body). |

Controllers that **do** use Zod at boundary: **impressions.controller** (recordImpressionSchema), **context-engine.controller** (driverPreferencesUpdateSchema for PATCH/POST driver-preferences).

### 2.2 Config validation and process.env

| Location | Violation |
|----------|-----------|
| **config.schema.ts** | Only validates: DATABASE_URL (required), PORT, NODE_ENV, REDIS_URL, STRIPE_*, TRANZILA_TERMINAL, SENTRY_DSN, ADMIN_API_KEY. Validation runs in main.ts via `validateEnv(process.env)` before bootstrap. |
| **process.env still used** | Services/controllers read env directly instead of injected config: **payments.service.ts** (STRIPE_SECRET_KEY, TRANZILA_TERMINAL), **webhooks.controller.ts** (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET), **app.module.ts** (NODE_ENV for logger), **main.ts** (SENTRY_DSN, NODE_ENV, PORT), **ad-selection/strategies/emergency-rules.strategy.ts** (SKIP_EMERGENCY_FOR_TESTING), **ad-creative/services/trends.service.ts** (SERPAPI_API_KEY), **ad-creative/services/llm.service.ts** (OPENAI_API_KEY, GEMINI_API_KEY), **external-api/weather-api.service.ts** (OPENWEATHERMAP_API_KEY, WEATHER_API_KEY), **external-api/places-api.service.ts** (GOOGLE_PLACES_API_KEY), **admin/guards/admin-api-key.guard.ts** (ADMIN_API_KEY), **redis/redis.service.ts** (REDIS_URL). |
| **ConfigService** | No Nest ConfigService in use; validated env is not injected into services. Plan Phase 5 used bootstrap-only validation due to @nestjs/config peer conflict. |

---

## 3. Core Logic: The Impression Engine

### 3.1 Atomic method and pure functions

- **ImpressionEstimatorService** correctly uses pure functions from `estimation-factors.util.ts` (`getTimeMultiplier`, `getSpeedFactor`). Math is separated; estimator only composes them and does the async density lookup. **Compliant.**

### 3.2 Israeli edge cases: TimeMultiplier

- **Thu/Fri/Sat 21:00–02:00:** Implemented as `(isThu || isFri || isSat) && (hour >= 21 || hour <= 2)` → 1.6. **Correct.**
- **Morning rush 07:30–09:30:** Comment in `estimation-factors.util.ts` says "Sun–Thu 07:30–09:30 → 1.4", but code uses `hour === 7 || hour === 8` only. **Hour 9 (09:00–09:59) is not included**; if 09:30 is intended, implementation is inconsistent with the comment.

### 3.3 Stop-light premium (2.0x)

- **Condition:** speed 0 and dwell > 10s. Implemented as `speedKmh === 0 && dwellSeconds !== undefined && dwellSeconds !== null && dwellSeconds > 10` → 2.0. **Correct.**

### 3.4 Live events (e.g. Bloomfield Stadium)

- **LiveEvents table:** Not present in Prisma schema. No model or repository for live events.
- **ImpressionEstimatorService** uses a constant `EVENT_TRIGGER_FACTOR = 1.0`; there is no lookup to an events table or geofence-based multiplier. **Engine does not check a LiveEvents table for active event-based multipliers.**

---

## 4. Data Integrity & Performance

### 4.1 Geohash level 7

| Location | Finding |
|----------|---------|
| **impression-estimator.service.ts** | Uses `toGeohash7(input.geohash)` for density lookup. **Compliant.** |
| **traffic-density.repository.ts** | Uses `toGeohash7(geohash)` for cache key and DB query. **Compliant.** |
| **impressions.repository.ts** | Stores `input.geohash` as provided; **no normalization to level 7**. Stored geohash can be any length. If "all location lookups" includes storage for consistency/analytics, this is a gap. |
| **ad-selection.controller.ts** / **context-engine** | Pass geohash through to engine/context; estimator and traffic-density normalize internally. External APIs (places, weather) use geohash for cache keys but do not enforce length. |

### 4.2 Frequency capping (15s duplicate driver/campaign)

- **Idempotency:** Impression recording is idempotent by `client_uuid` (upsert); same client_uuid yields one record.
- **15-second rule:** There is **no** mechanism (cache or DB) to prevent recording a duplicate impression within 15 seconds for the same driver + campaign (e.g. same driver, same campaign, second request within 15s). Only client_uuid prevents duplicates.

### 4.3 Naming: DB vs DTO

- **Prisma schema:** Uses camelCase (clientUuid, campaignId, driverId, etc.).
- **API DTOs:** Record-impression uses `client_uuid` in the request body (snake_case) and maps to `clientUuid` in service/repo. Other DTOs use camelCase. No inconsistency between DB (camelCase) and internal types; API surface uses snake_case only for record-impression. **Acceptable** if intentional for client compatibility.

---

## 5. Quality Signals

### 5.1 Global exception filter and error shape

- **HttpExceptionFilter** is registered globally and returns `{ success: false, message, code }`. Handles HttpException and validation (array message). **Compliant.**

### 5.2 Dead code

- No systematic scan of unused interfaces/DTOs; spot checks did not find obvious dummy services. **RankedQueryDto** and **ContextQueryDto** (and their schemas) are effectively unused at the backend boundary (defined in shared lib but not applied in controllers). They are not dead code but **underused**.

---

## 6. Modularization & Function Atomicity

### 6.1 Feature-based modules

- Modules are feature-based: CampaignModule, ImpressionsModule, ContextEngineModule, AdSelectionModule, TrafficDensityModule, etc. **Compliant.**

### 6.2 Method length (20–30 lines)

| Location | Violation |
|----------|-----------|
| **ad-selection.controller.ts** | `getRanked` (approx. lines 63–134) is **~72 lines**; exceeds 20–30 line guideline. Logic includes validation, Promise.all, alcohol filter, candidate fetch/filter, context build, engine call, metrics, logging, return. |

Other controller methods (postSelect, admin, payments, etc.) are within or close to the limit.

### 6.3 Pure calculation logic

- Estimation formulas are in `estimation-factors.util.ts` as pure functions. **Compliant.**

### 6.4 Dependency injection

- Complex logic is in strategies and services; repositories are injected. **PaymentsService** and **AdCreativeService** bypass repositories and use Prisma directly—already listed under 1.3.

---

## Summary Table

| Category | Status | Count (high level) |
|----------|--------|--------------------|
| Controllers without DTO/Zod at boundary | Violations | 10+ controllers/routes |
| Controllers with business logic | Minor | Ad-selection orchestration |
| Services using Prisma directly | Violations | 2 (Payments, AdCreative) |
| process.env without ConfigService | Violations | 10+ files |
| Shared Zod schemas not used at boundary | Underuse | rankedQuery, contextQuery |
| Morning rush 09:00–09:59 | Inconsistency | Comment vs code |
| LiveEvents table / event multipliers | Missing | Not implemented |
| Geohash 7 for all lookups | Partial | Impression storage not normalized |
| Frequency cap 15s (driver+campaign) | Missing | Not implemented |
| Global exception filter | OK | Implemented |
| console.* in backend | Minor | main.ts bootstrap, health.controller |
| getRanked method length | Violation | ~72 lines |

---

*End of Technical Debt Report. No fixes were applied; list is for review and approval before implementation.*
