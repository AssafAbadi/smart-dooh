-- Remove legacy pref_* and unused boolean columns from DriverPreferences (MVP: preference_tags only).
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_veganOnly";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_vegetarianOnly";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_kosherOnly";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_noAlcohol";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_noGambling";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "pref_unkosherOnly";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "kosherOnly";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "excludeAlcohol";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "excludeMeat";
