import { z } from 'zod';

const preferenceFilterEnum = z.enum([
  'NO_ALCOHOL',
  'KOSHER_ONLY',
  'UNKOSHER_ONLY',
  'VEGAN_ONLY',
  'VEGETARIAN_ONLY',
  'NO_GAMBLING',
]);

/** Body for PATCH/POST driver-preferences (matches backend DriverPreferencesUpdate) */
export const driverPreferencesUpdateSchema = z.object({
  preference_tags: z.array(preferenceFilterEnum).optional(),
  excludedLanguages: z.array(z.string()).optional(),
});

export type DriverPreferencesUpdateDto = z.infer<typeof driverPreferencesUpdateSchema>;
export const driverPreferencesUpdateSafeParse = driverPreferencesUpdateSchema.safeParse;
