import { z } from 'zod';

export const locationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type LocationQueryDto = z.infer<typeof locationQuerySchema>;

export const testAlertBodySchema = z.object({
  areas: z.array(z.string().min(1)).min(1).default(['תל אביב - מרכז העיר']),
  headline: z.string().min(1).default('אזעקת טילים - בדיקה'),
});
export type TestAlertBodyDto = z.infer<typeof testAlertBodySchema>;

export const registerPayloadSchema = z.object({
  driverId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const updatePositionPayloadSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type UpdatePositionPayload = z.infer<typeof updatePositionPayloadSchema>;
