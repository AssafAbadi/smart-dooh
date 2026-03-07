-- AlterTable DriverPreferences: add dietary/religious/ethical preference flags
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_veganOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_vegetarianOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_kosherOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_noAlcohol" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_noGambling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverPreferences" ADD COLUMN "pref_unkosherOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Business: add corresponding attributes for matching
ALTER TABLE "Business" ADD COLUMN "is_vegan" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "is_vegetarian" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "is_kosher" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "contains_alcohol" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "is_gambling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "is_unkosher" BOOLEAN NOT NULL DEFAULT false;
