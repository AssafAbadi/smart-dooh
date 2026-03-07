-- AlterTable: add geofence to Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "geofence" JSONB;

-- CreateTable: Redemption
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "impressionId" TEXT,
    "campaignId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "couponCode" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);
