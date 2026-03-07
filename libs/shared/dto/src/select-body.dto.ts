import { z } from 'zod';

const selectionContextSchema = z.object({
  weather: z
    .object({ tempCelsius: z.number(), condition: z.string() })
    .nullable(),
  timeHour: z.number(),
  poiDensity: z.number(),
});

const bleHintSchema = z.object({
  type: z.literal('IMMEDIATE'),
  businessId: z.string(),
});

/** Body for POST /ad-selection/select. Required: driverId, lat, lng, geohash. */
export const selectBodySchema = z.object({
  driverId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  geohash: z.string().min(1),
  bleHint: bleHintSchema.optional(),
  candidates: z.array(z.record(z.string(), z.unknown())).optional(),
  context: selectionContextSchema.optional(),
});

export type SelectBodyDto = z.infer<typeof selectBodySchema>;
export const selectBodySafeParse = selectBodySchema.safeParse;
