-- CreateTable TargetingPreferences (1:1 with Business). snake_case columns per plan.
CREATE TABLE "TargetingPreferences" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "min_temp" DOUBLE PRECISION,
    "max_temp" DOUBLE PRECISION,
    "weather_condition" TEXT,
    "proximity_triggers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetingPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TargetingPreferences_businessId_key" ON "TargetingPreferences"("businessId");

ALTER TABLE "TargetingPreferences" ADD CONSTRAINT "TargetingPreferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
