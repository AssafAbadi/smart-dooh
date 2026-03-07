import { z } from 'zod';

/** Body for POST /driver/location – real-time GPS from the mobile app */
export const driverLocationBodySchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
  deviceId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geohash: z.string().optional(),
});

export type DriverLocationBodyDto = z.infer<typeof driverLocationBodySchema>;
export const driverLocationBodySafeParse = driverLocationBodySchema.safeParse;
