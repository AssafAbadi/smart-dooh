# Logging guide

Logging is in place so you can track failures and key flows in one place.

## Backend (API)

- **Where:** Terminal where you run `npm run start:api` (or `nx serve backend-api`). All logs go to stdout; in dev, Pino pretty-prints them.
- **What is logged:**
  - **Bootstrap:** `[Bootstrap] Backend API listening on http://0.0.0.0:3000`
  - **ContextEngineController:** GET/PATCH/POST driver-preferences (driverId, preference_tags), GET businesses count, GET context (params, businesses/pois count). Failed PATCH/POST log the error and stack.
  - **ContextEngineService:** getDriverPreferences (found/null), updateDriverPreferences (body), getFilteredBusinessesForDriver (preference_tags, business count), getContextWithIntegrations (params).
  - **DriverPreferencesRepository:** getByDriverId (found/null), upsert (driverId, preference_tags).
  - **BusinessRepository:** findFiltered (preference_tags, excluded counts, row count).
  - **AdSelectionController:** GET ranked / POST select (missing params warning, driverId, candidates count, instructions count).
  - **HealthController:** ready check failure (when not ready).
- **How to use:** Reproduce a problem (e.g. save filter), then check the backend terminal for the corresponding `[ContextEngineController]` or `[DriverPreferencesRepository]` line and any `FAILED` or stack trace below it.

## Mobile app (Expo / React Native)

- **Where:** Metro bundler terminal and device/simulator logs (Expo Go: shake device → “Debug Remote JS” to see console in browser, or run with `npx expo start` and use Flipper/React Native Debugger).
- **What is logged:** All app logs are prefixed with `[Adrive]`:
  - **Driver preferences:** fetch failed (status, driverId), fetch error, loaded (driverId, preference_tags), save failed (status, body), save error, save success (driverIds, preference_tags).
  - **BackgroundDriverLogic:** heartbeat failure, ad-selection ranked failed (status, driverId), ad-selection ranked error.
  - **Simulator position:** effect (simulatorMode), position fetch failed (status), position error.
- **How to use:** When something fails (e.g. “Save failed 500”), look for `[Adrive]` lines just before or after; the error line will include the message or status so you can correlate with backend logs.

## Adding logs for future failures

- **Backend:** Use `console.log('[YourModule]', ...)` or Nest `Logger` so lines are easy to grep (e.g. `[ContextEngineController]`).
- **Mobile:** Use the shared `logger` in `apps/mobile-driver/src/utils/logger.ts`: `logger.info()`, `logger.warn()`, `logger.error()` so all messages stay under the `[Adrive]` prefix.
