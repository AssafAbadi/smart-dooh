import { z } from 'zod';

/** Minimal Stripe event schema for payment_intent.succeeded (parse after signature verification). */
export const stripePaymentIntentSucceededEventSchema = z.object({
  type: z.literal('payment_intent.succeeded'),
  data: z.object({
    object: z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.string()).optional(),
    }),
  }),
});

export type StripePaymentIntentSucceededEvent = z.infer<typeof stripePaymentIntentSucceededEventSchema>;
