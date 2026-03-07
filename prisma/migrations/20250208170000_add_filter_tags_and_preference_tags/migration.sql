-- CreateEnum
CREATE TYPE "FilterTag" AS ENUM ('KOSHER', 'VEGETARIAN', 'VEGAN', 'NO_ALCOHOL', 'NO_GAMBLING', 'UNKOSHER');

-- AlterTable Business: add tags (ad shown only if driver's preference_tags ⊆ tags)
ALTER TABLE "Business" ADD COLUMN "tags" "FilterTag"[] DEFAULT ARRAY[]::"FilterTag"[];

-- AlterTable DriverPreferences: add preference_tags (driver wants ads that have ALL of these tags)
ALTER TABLE "DriverPreferences" ADD COLUMN "preference_tags" "FilterTag"[] DEFAULT ARRAY[]::"FilterTag"[];
