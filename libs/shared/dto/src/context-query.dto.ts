import { z } from 'zod';

/** Query params for GET /context-engine/context */
export const contextQuerySchema = z.object({
  driverId: z.string().min(1),
  deviceId: z.string().min(1),
  lat: z.string().transform((s) => parseFloat(s)),
  lng: z.string().transform((s) => parseFloat(s)),
  geohash: z.string().min(1),
});

export type ContextQueryDto = z.infer<typeof contextQuerySchema>;
export const contextQuerySafeParse = contextQuerySchema.safeParse;
