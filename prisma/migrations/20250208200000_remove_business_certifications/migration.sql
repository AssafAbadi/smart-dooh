-- Remove unused Business.certifications column (kosher/attributes are in tags).
ALTER TABLE "Business" DROP COLUMN IF EXISTS "certifications";
