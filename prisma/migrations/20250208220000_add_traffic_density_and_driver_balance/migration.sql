-- AlterTable Driver: add balance (ILS, real-time)
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable Campaign: add ratePerReach (ILS per estimated reach)
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "ratePerReach" DOUBLE PRECISION;

-- CreateTable TrafficDensity (geohash level 7, Israeli dayOfWeek 0-6, hour 0-23)
CREATE TABLE IF NOT EXISTS "TrafficDensity" (
    "id" TEXT NOT NULL,
    "geohash" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "baseDensity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficDensity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrafficDensity_geohash_dayOfWeek_hour_key" ON "TrafficDensity"("geohash", "dayOfWeek", "hour");
CREATE INDEX IF NOT EXISTS "TrafficDensity_geohash_dayOfWeek_hour_idx" ON "TrafficDensity"("geohash", "dayOfWeek", "hour");
