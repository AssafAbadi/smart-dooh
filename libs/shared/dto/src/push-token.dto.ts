import { z } from 'zod';

/** Body for POST /drivers/push-token – register Expo push token for a driver */
export const registerPushTokenSchema = z.object({
  driverId: z.string().min(1, 'driverId is required'),
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
