import { z } from 'zod';

export const emergencyDataSchema = z.object({
  type: z.literal('MISSILE_ALERT'),
  shelterAddress: z.string(),
  shelterLat: z.number(),
  shelterLng: z.number(),
  distanceMeters: z.number().int().nonnegative(),
  bearingDegrees: z.number().int().min(0).max(360),
  direction: z.enum(['up', 'down', 'left', 'right']),
  alertHeadline: z.string(),
  alertTimestamp: z.string(),
});

export type EmergencyData = z.infer<typeof emergencyDataSchema>;

export const emergencyCheckResultSchema = z.discriminatedUnion('active', [
  z.object({ active: z.literal(false) }),
  z.object({
    active: z.literal(true),
    shelter: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      distanceMeters: z.number(),
      bearingDegrees: z.number(),
      direction: z.enum(['up', 'down', 'left', 'right']),
    }),
    alert: z.object({
      headline: z.string(),
      timestamp: z.string(),
    }),
  }),
]);

export type EmergencyCheckResult = z.infer<typeof emergencyCheckResultSchema>;
