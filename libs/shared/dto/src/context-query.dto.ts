import { z } from 'zod';

/** Query params for GET /context-engine/context (driverId from JWT when using auth route) */
export const contextQuerySchema = z.object({
  driverId: z.string().min(1),
  deviceId: z.string().min(1),
  lat: z.string().transform((s) => parseFloat(s)),
  lng: z.string().transform((s) => parseFloat(s)),
  geohash: z.string().min(1),
});

export type ContextQueryDto = z.infer<typeof contextQuerySchema>;

/** Query params when driverId comes from JWT */
export const contextQueryAuthSchema = z.object({
  deviceId: z.string().min(1),
  lat: z.string().transform((s) => parseFloat(s)),
  lng: z.string().transform((s) => parseFloat(s)),
  geohash: z.string().min(1),
});

export type ContextQueryAuthDto = z.infer<typeof contextQueryAuthSchema>;
export const contextQuerySafeParse = contextQuerySchema.safeParse;
