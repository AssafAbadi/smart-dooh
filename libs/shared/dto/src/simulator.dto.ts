import { z } from 'zod';

export const simulatorPositionBodySchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
  lat: z.number(),
  lng: z.number(),
  geohash: z.string().min(1, 'geohash is required'),
});

export type SimulatorPositionBodyDto = z.infer<typeof simulatorPositionBodySchema>;

export const simulatorPositionQuerySchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
});

export type SimulatorPositionQueryDto = z.infer<typeof simulatorPositionQuerySchema>;
