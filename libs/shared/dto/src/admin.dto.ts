import { z } from 'zod';

const geofenceCircleSchema = z.object({
  type: z.literal('circle'),
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number(),
});

const geofencePolygonSchema = z.object({
  type: z.literal('polygon'),
  coordinates: z.array(z.array(z.number())),
});

const geofenceSchema = z.union([geofenceCircleSchema, geofencePolygonSchema]);

export const adminListCreativesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const adminCreativeStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const adminCreateCampaignSchema = z.object({
  businessId: z.string().min(1),
  cpm: z.number(),
  budgetRemaining: z.number(),
  active: z.boolean().optional().default(true),
  geofence: geofenceSchema.optional(),
});

export const adminUpdateCampaignSchema = z.object({
  cpm: z.number().optional(),
  budgetRemaining: z.number().optional(),
  active: z.boolean().optional(),
  geofence: geofenceSchema.nullable().optional(),
});

export const adminRedemptionSchema = z.object({
  campaignId: z.string().min(1),
  creativeId: z.string().min(1),
  couponCode: z.string().optional(),
  impressionId: z.string().optional(),
});

export type AdminListCreativesQueryDto = z.infer<typeof adminListCreativesQuerySchema>;
export type AdminCreativeStatusDto = z.infer<typeof adminCreativeStatusSchema>;
export type AdminCreateCampaignDto = z.infer<typeof adminCreateCampaignSchema>;
export type AdminUpdateCampaignDto = z.infer<typeof adminUpdateCampaignSchema>;
export type AdminRedemptionDto = z.infer<typeof adminRedemptionSchema>;
