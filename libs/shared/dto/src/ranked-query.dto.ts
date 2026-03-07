import { z } from 'zod';

/** Query params for GET /ad-selection/ranked */
export const rankedQuerySchema = z.object({
  driverId: z.string().min(1),
  lat: z.string().transform((s) => parseFloat(s)),
  lng: z.string().transform((s) => parseFloat(s)),
  geohash: z.string().min(1),
  bleBusinessId: z.string().optional(),
  timeHour: z.string().optional().transform((s) => (s !== undefined ? parseInt(s, 10) : undefined)),
  poiDensity: z.string().optional().transform((s) => (s !== undefined ? parseInt(s, 10) : undefined)),
  tempCelsius: z.string().optional().transform((s) => (s !== undefined ? parseFloat(s) : undefined)),
  weatherCondition: z.string().optional(),
});

export type RankedQueryDto = z.infer<typeof rankedQuerySchema>;
export const rankedQuerySafeParse = rankedQuerySchema.safeParse;
