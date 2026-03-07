import { z } from 'zod';

export const recordImpressionSchema = z.object({
  client_uuid: z.string().min(1, 'client_uuid is required').transform((s) => s.trim()),
  campaignId: z.string().min(1, 'campaignId is required'),
  creativeId: z.string().min(1, 'creativeId is required'),
  deviceId: z.string().min(1, 'deviceId is required'),
  driverId: z.string().optional(),
  lat: z.coerce.number().refine((n) => !Number.isNaN(n), 'lat must be a number'),
  lng: z.coerce.number().refine((n) => !Number.isNaN(n), 'lng must be a number'),
  geohash: z.string().min(1, 'geohash is required'),
  speedKmh: z.coerce.number().optional(),
  dwellSeconds: z.coerce.number().optional(),
});

export type RecordImpressionDto = z.infer<typeof recordImpressionSchema>;
export const recordImpressionSafeParse = recordImpressionSchema.safeParse;
