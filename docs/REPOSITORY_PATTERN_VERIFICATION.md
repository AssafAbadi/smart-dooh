# Repository Pattern Verification (2026)

**Date:** 2026-02-20  
**Scope:** Backend API – zero Prisma in services.

## Result: Compliant

- **Audit:** Grep for `PrismaService` and `this.prisma` / `prisma.` in all `*.service.ts` under `apps/backend-api/src` shows:
  - `PrismaService` appears only in `prisma/prisma.service.ts` (the Nest wrapper for the client).
  - No `prisma.` calls in any application service file.
- All data access is performed via **repositories**; services depend only on repository interfaces or concrete repositories (PaymentsRepository, CreativeRepository, CampaignCreativeRepository, etc.).
- **Naming:** The domain uses the **Creative** model and **CreativeRepository** for ad creatives. "Creative" is used consistently; no rename to "AdCreative" was required.

## Repository inventory (services use these only)

| Area | Repository | Used by |
|------|------------|--------|
| Payments | PaymentsRepository | PaymentsService |
| Ad Creative | CreativeRepository | AdCreativeService |
| Ad Selection | CampaignCreativeRepository, EmergencyAlertRepository | AdSelectionFacade, strategies |
| Context | BusinessRepository, DriverPreferencesRepository, ContextSnapshotRepository | ContextEngineService |
| Impressions | ImpressionsRepository, CampaignRepository, DriverRepository | ImpressionsService |
| Impression estimation | LiveEventRepository, TrafficDensity (via repo) | ImpressionEstimatorService |
| Admin | Admin Campaign/Creative/Redemption/Analytics repos | AdminService |
| Car Screen | CarScreenRepository | CarScreenService |
| External API | N/A (WeatherApiService, PlacesApiService use ConfigService + HTTP) | ContextEngineService, etc. |

No missing repository methods were identified; no service performs direct Prisma calls.

---

## Israel timezone (Phase 1.5)

All server-side "time of day" logic uses **Asia/Jerusalem** via `TimeService.getIsraelNow()` (see `core/time/time.service.ts`). Impression estimation (TimeMultiplier morning rush 07:30–09:30) and ad-selection context default hour use Israel time so behavior is correct regardless of server TZ.
