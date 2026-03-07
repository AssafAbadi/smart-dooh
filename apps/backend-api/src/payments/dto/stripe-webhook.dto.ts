/**
 * Represents the verified Stripe webhook event after signature verification.
 * Verification uses ConfigService.get('STRIPE_WEBHOOK_SECRET'); no process.env.
 */
export interface StripeWebhookVerifiedEvent {
  type: string;
  data: {
    object: {
      id?: string;
      metadata?: Record<string, string>;
    };
  };
}
