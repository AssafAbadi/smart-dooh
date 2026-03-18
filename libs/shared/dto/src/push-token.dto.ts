import { z } from 'zod';

/** Body for POST /drivers/push-token – register Expo push token (driverId from JWT) */
export const registerPushTokenSchema = z.object({
  pushToken: z
    .string()
    .min(1, 'pushToken is required')
    .refine(
      (s) => s.startsWith('ExponentPushToken[') && s.endsWith(']'),
      'pushToken must be a valid Expo push token (ExponentPushToken[...])',
    ),
});

export type RegisterPushTokenDto = z.infer<typeof registerPushTokenSchema>;
export const registerPushTokenSafeParse = registerPushTokenSchema.safeParse;
