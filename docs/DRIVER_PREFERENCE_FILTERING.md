# Driver Preference Filtering

The ad-matching engine filters businesses (and thus campaigns/ads) based on driver dietary, religious, and ethical preferences.

## Schema

### DriverPreferences (driver-side flags)

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `pref_veganOnly` | boolean | false | Only show vegan businesses |
| `pref_vegetarianOnly` | boolean | false | Only show vegetarian businesses |
| `pref_kosherOnly` | boolean | false | Only show kosher businesses |
| `pref_noAlcohol` | boolean | false | Exclude businesses that serve/contain alcohol |
| `pref_noGambling` | boolean | false | Exclude gambling-related businesses |
| `pref_unkosherOnly` | boolean | false | Only show explicitly non-kosher businesses |

Legacy fields still supported: `kosherOnly`, `excludeAlcohol`, `excludeMeat`, `excludedLanguages`, `excludedCategories`.

### Business (business-side attributes)

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `is_vegan` | boolean | false | Business is vegan |
| `is_vegetarian` | boolean | false | Business is vegetarian |
| `is_kosher` | boolean | false | Business is kosher |
| `contains_alcohol` | boolean | false | Business serves/contains alcohol |
| `is_gambling` | boolean | false | Business is gambling-related |
| `is_unkosher` | boolean | false | Business is explicitly non-kosher |

Legacy: `servesAlcohol`, `certifications.kosher` are still used and merged with the new fields where appropriate.

## Filter Logic

- **pref_veganOnly** → Exclude businesses where `is_vegan` is false (include only `is_vegan === true`). Missing metadata is treated as false (excluded).
- **pref_vegetarianOnly** → Include only businesses where `is_vegetarian === true`.
- **pref_kosherOnly** → Include only businesses where `is_kosher === true` or `certifications.kosher` is true.
- **pref_noAlcohol** → Exclude businesses where `servesAlcohol === true` or `contains_alcohol === true`.
- **pref_noGambling** → Exclude businesses where `is_gambling === true`.
- **pref_unkosherOnly** → Include only businesses where `is_unkosher === true`.

If a driver has **no preference** set (null/false), that filter is not applied and no ads are restricted by it.

## Integration

Filtering runs in **Context Engine** → **getFilteredBusinessesForDriver(driverId)**:

1. Load driver preferences (DriverPreferencesRepository).
2. Build a BusinessFilter from preferences (default false for unset prefs).
3. BusinessRepository.findFiltered(filter) returns only matching businesses (SQL-level WHERE).
4. Ad-selection controller uses these business IDs to fetch candidates; only compliant ads are returned to the mobile app.

So the **getAdsForDriver** flow (GET `/ad-selection/ranked`) only receives compliant ads.

## Migration and seed

These are run for you when schema or seed changes are made (see `docs/RUN_MIGRATIONS_AND_SEED.md`):

1. `npx prisma migrate deploy`
2. `npx prisma generate`
3. `npx prisma db seed`

Seed adds:
   - **Tel Aviv Café**: vegetarian, kosher (existing business updated).
   - **Green Leaf Vegan**: vegan, vegetarian, unkosher.
   - **Rothschild Bar**: contains alcohol, unkosher.
   - **Meat & Wine Kosher**: kosher, contains alcohol.
   - **driver-1** preferences: `pref_noAlcohol: true`, `pref_kosherOnly: true` (so only kosher, no-alcohol businesses; e.g. Tel Aviv Café still matches).

## Testing

- Use driver `driver-1` (or create a driver and set DriverPreferences) with different preference combinations.
- Call `GET /ad-selection/ranked?driverId=...&lat=...&lng=...&geohash=...` and verify returned `instructions` only reference businesses that match the driver’s preferences.
- Optional: add campaigns for “Green Leaf Vegan”, “Rothschild Bar”, “Meat & Wine Kosher” and verify that with `pref_kosherOnly` + `pref_noAlcohol` you only see Tel Aviv Café (and any other kosher, no-alcohol businesses).
