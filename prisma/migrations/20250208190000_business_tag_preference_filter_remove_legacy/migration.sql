-- CreateEnum BusinessTag and PreferenceFilter
CREATE TYPE "BusinessTag" AS ENUM ('RESTAURANT', 'SERVES_ALCOHOL', 'KOSHER', 'VEGAN', 'VEGETARIAN', 'GAMBLING');
CREATE TYPE "PreferenceFilter" AS ENUM ('NO_ALCOHOL', 'KOSHER_ONLY', 'UNKOSHER_ONLY', 'VEGAN_ONLY', 'VEGETARIAN_ONLY', 'NO_GAMBLING');

-- Business: add new tags column with BusinessTag[], migrate data, drop old columns
ALTER TABLE "Business" ADD COLUMN "tags_new" "BusinessTag"[] DEFAULT ARRAY[]::"BusinessTag"[];

UPDATE "Business" SET "tags_new" = (
  array_cat(
    array_cat(
      CASE WHEN ARRAY['KOSHER']::"FilterTag"[] <@ "tags" THEN ARRAY['KOSHER'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END,
      CASE WHEN ARRAY['VEGAN']::"FilterTag"[] <@ "tags" THEN ARRAY['VEGAN'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END
    ),
    array_cat(
      array_cat(
        CASE WHEN ARRAY['VEGETARIAN']::"FilterTag"[] <@ "tags" THEN ARRAY['VEGETARIAN'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END,
        CASE WHEN "servesAlcohol" OR "contains_alcohol" THEN ARRAY['SERVES_ALCOHOL'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END
      ),
      array_cat(
        CASE WHEN "is_gambling" THEN ARRAY['GAMBLING'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END,
        CASE WHEN "tags" <> ARRAY[]::"FilterTag"[] OR "servesAlcohol" = true OR "contains_alcohol" = true OR "is_vegan" = true OR "is_vegetarian" = true OR "is_kosher" = true THEN ARRAY['RESTAURANT'::"BusinessTag"] ELSE ARRAY[]::"BusinessTag"[] END
      )
    )
  )
);

ALTER TABLE "Business" DROP COLUMN "tags";
ALTER TABLE "Business" RENAME COLUMN "tags_new" TO "tags";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "servesAlcohol";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "servesMeat";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "is_vegan";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "is_vegetarian";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "is_kosher";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "contains_alcohol";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "is_gambling";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "is_unkosher";

-- DriverPreferences: add new preference_tags with PreferenceFilter[], migrate data, drop old
ALTER TABLE "DriverPreferences" ADD COLUMN "preference_tags_new" "PreferenceFilter"[] DEFAULT ARRAY[]::"PreferenceFilter"[];

UPDATE "DriverPreferences" SET "preference_tags_new" = (
  COALESCE(
    ARRAY(
      SELECT CASE t::text
        WHEN 'NO_ALCOHOL' THEN 'NO_ALCOHOL'::"PreferenceFilter"
        WHEN 'KOSHER' THEN 'KOSHER_ONLY'::"PreferenceFilter"
        WHEN 'UNKOSHER' THEN 'UNKOSHER_ONLY'::"PreferenceFilter"
        WHEN 'VEGAN' THEN 'VEGAN_ONLY'::"PreferenceFilter"
        WHEN 'VEGETARIAN' THEN 'VEGETARIAN_ONLY'::"PreferenceFilter"
        WHEN 'NO_GAMBLING' THEN 'NO_GAMBLING'::"PreferenceFilter"
      END
      FROM unnest("preference_tags") AS t
      WHERE CASE t::text
        WHEN 'NO_ALCOHOL' THEN true WHEN 'KOSHER' THEN true WHEN 'UNKOSHER' THEN true
        WHEN 'VEGAN' THEN true WHEN 'VEGETARIAN' THEN true WHEN 'NO_GAMBLING' THEN true
        ELSE false END
    ),
    ARRAY[]::"PreferenceFilter"[]
  )
);

ALTER TABLE "DriverPreferences" DROP COLUMN "preference_tags";
ALTER TABLE "DriverPreferences" RENAME COLUMN "preference_tags_new" TO "preference_tags";

-- Drop old enum
DROP TYPE "FilterTag";
