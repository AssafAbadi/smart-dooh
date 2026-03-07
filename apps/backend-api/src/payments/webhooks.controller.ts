import { BadRequestException, Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { stripePaymentIntentSucceededEventSchema } from '@smart-dooh/shared-dto';
import { ExternalApiConfigService } from '../config/external-api-keys.config';
import { PaymentsService } from './payments.service';

/**
 * Stripe webhook handler (production: use webhook secret to verify signatures).
 * When Stripe confirms payment, auto-complete the Payment record.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  constructor(
    private readonly payments: PaymentsService,
    private readonly apiKeys: ExternalApiConfigService,
  ) {
    const stripeKey = this.apiKeys.getStripeSecretKey();
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });
    }
    this.webhookSecret = this.apiKeys.getStripeWebhookSecret() ?? null;
  }

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook (payment_intent.succeeded)' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') sig: string | undefined
  ) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    let event: Stripe.Event;
    if (this.webhookSecret && sig) {
      try {
        const rawBody = req.rawBody?.toString('utf-8') ?? '';
        event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
      } catch {
        throw new BadRequestException('Invalid signature');
      }
    } else {
      // Dev: no signature check (not secure; set STRIPE_WEBHOOK_SECRET in production)
      event = req.body as Stripe.Event;
    }

    const parsed = stripePaymentIntentSucceededEventSchema.safeParse(event);
    if (parsed.success && parsed.data.type === 'payment_intent.succeeded') {
      const paymentId = parsed.data.data.object.metadata?.paymentId;
      const intentId = parsed.data.data.object.id;
      if (paymentId && intentId) {
        await this.payments.completePayment(paymentId, intentId);
      }
    }

    return { received: true };
  }
}
