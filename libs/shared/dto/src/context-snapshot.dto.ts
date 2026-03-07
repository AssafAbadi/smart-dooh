import { z } from 'zod';

const weatherSchema = z.object({
  tempC: z.number().optional(),
  condition: z.string().optional(),
  humidity: z.number().optional(),
  windKmh: z.number().optional(),
});

const nearbyPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number().optional(),
});

export const contextSnapshotSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  geohash: z.string(),
  speedKmh: z.number(),
  speedBucket: z.string(),
  weather: weatherSchema.optional(),
  nearbyPlaces: z.array(nearbyPlaceSchema).optional(),
  proximity: z.enum(['IMMEDIATE', 'NORMAL']),
  timeOfDay: z.string(),
  timestamp: z.union([z.string().datetime(), z.number()]),
});

export type ContextSnapshot = z.infer<typeof contextSnapshotSchema>;
export const contextSnapshotValidator = contextSnapshotSchema.parse;
export const contextSnapshotSafeParse = contextSnapshotSchema.safeParse;
