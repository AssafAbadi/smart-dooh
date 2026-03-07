-- Remove Business.categories and DriverPreferences.excludedCategories (filtering is tags-only).
ALTER TABLE "Business" DROP COLUMN IF EXISTS "categories";
ALTER TABLE "DriverPreferences" DROP COLUMN IF EXISTS "excludedCategories";
