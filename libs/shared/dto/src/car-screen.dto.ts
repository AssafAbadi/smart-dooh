import { z } from 'zod';

export const heartbeatBodySchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  driverId: z.string().optional(),
});

export type HeartbeatBodyDto = z.infer<typeof heartbeatBodySchema>;
