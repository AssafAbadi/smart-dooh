import { z } from 'zod';

const nanSafeFloat = (min?: number, max?: number) =>
  z.string().transform((s) => parseFloat(s)).refine((v) => !isNaN(v), { message: 'Must be a valid number' })
    .refine((v) => min === undefined || v >= min, { message: `Must be >= ${min}` })
    .refine((v) => max === undefined || v <= max, { message: `Must be <= ${max}` });

const nanSafeOptionalFloat = () =>
  z.string().optional().transform((s) => (s !== undefined ? parseFloat(s) : undefined))
    .refine((v) => v === undefined || !isNaN(v), { message: 'Must be a valid number' });

const nanSafeOptionalInt = (min?: number, max?: number) =>
  z.string().optional().transform((s) => (s !== undefined ? parseInt(s, 10) : undefined))
    .refine((v) => v === undefined || !isNaN(v), { message: 'Must be a valid integer' })
    .refine((v) => v === undefined || min === undefined || v >= min, { message: `Must be >= ${min}` })
    .refine((v) => v === undefined || max === undefined || v <= max, { message: `Must be <= ${max}` });

/** Query params for GET /ad-selection/ranked (with driverId in query – e.g. display) */
export const rankedQuerySchema = z.object({
  driverId: z.string().min(1),
  lat: nanSafeFloat(-90, 90),
  lng: nanSafeFloat(-180, 180),
  geohash: z.string().min(1),
  bleBusinessId: z.string().optional(),
  timeHour: nanSafeOptionalInt(0, 23),
  poiDensity: nanSafeOptionalInt(0),
  tempCelsius: nanSafeOptionalFloat(),
  weatherCondition: z.string().optional(),
});

export type RankedQueryDto = z.infer<typeof rankedQuerySchema>;

/** Query params for GET /ad-selection/ranked when using JWT (driverId from token) */
export const rankedQueryAuthSchema = z.object({
  lat: nanSafeFloat(-90, 90),
  lng: nanSafeFloat(-180, 180),
  geohash: z.string().min(1),
  bleBusinessId: z.string().optional(),
  timeHour: nanSafeOptionalInt(0, 23),
  poiDensity: nanSafeOptionalInt(0),
  tempCelsius: nanSafeOptionalFloat(),
  weatherCondition: z.string().optional(),
});

export type RankedQueryAuthDto = z.infer<typeof rankedQueryAuthSchema>;
export const rankedQuerySafeParse = rankedQuerySchema.safeParse;
