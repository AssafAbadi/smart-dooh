import { z } from 'zod';

export const adInstructionSchema = z.object({
  campaignId: z.string(),
  creativeId: z.string(),
  variantId: z.string().optional(),
  headline: z.string(),
  body: z.string().optional(),
  placeholders: z.record(z.string(), z.string()).optional(),
  imageUrl: z.string().url().optional(),
  couponCode: z.string().optional(),
  ttlSeconds: z.number().optional(),
  priority: z.number().optional(),
  distanceMeters: z.number().optional(),
  businessLat: z.number().optional(),
  businessLng: z.number().optional(),
});

export type AdInstruction = z.infer<typeof adInstructionSchema>;
export const adInstructionValidator = adInstructionSchema.parse;
export const adInstructionSafeParse = adInstructionSchema.safeParse;
