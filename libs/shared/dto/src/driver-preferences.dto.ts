import { z } from 'zod';

export const driverPreferencesSchema = z.object({
  kosherOnly: z.boolean().optional().default(false),
  excludeAlcohol: z.boolean().optional().default(false),
  excludedLanguages: z.array(z.string()).optional().default([]),
});

export type DriverPreferencesDto = z.infer<typeof driverPreferencesSchema>;
export const driverPreferencesSafeParse = driverPreferencesSchema.safeParse;
