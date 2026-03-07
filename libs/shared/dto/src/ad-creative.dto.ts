import { z } from 'zod';

export const generateFromTrendBodySchema = z.object({
  regionCode: z.string().min(1),
  campaignId: z.string().min(1),
  businessName: z.string().min(1),
  category: z.string(),
  distanceMeters: z.number(),
  couponCode: z.string(),
  timeLeftMinutes: z.number(),
  preferredLang: z.string().optional(),
});

export type GenerateFromTrendBodyDto = z.infer<typeof generateFromTrendBodySchema>;

export const translatedCreativeQuerySchema = z.object({
  lang: z.string().optional().default('en'),
});

export type TranslatedCreativeQueryDto = z.infer<typeof translatedCreativeQuerySchema>;
