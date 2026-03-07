import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ExternalApiConfigService } from '../config/external-api-keys.config';
import { PaymentsRepository } from './repositories/payments.repository';

/**
 * Payments & Billing (Prompt 8).
 * Stripe/Tranzila for advertiser pre-pay; driver earnings and payouts.
 */
@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;
  private tranzilaTerminal: string | null = null;

  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly apiKeys: ExternalApiConfigService,
  ) {
    const stripeKey = this.apiKeys.getStripeSecretKey();
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });
    }
    this.tranzilaTerminal = this.apiKeys.getTranzilaTerminal() ?? null;
  }

  /**
   * Create a payment intent (Stripe) or payment session (Tranzila) for advertiser pre-pay.
   */
  async createPaymentIntent(
    businessId: string,
    amountCents: number,
    provider: 'stripe' | 'tranzila',
    campaignId?: string
  ): Promise<{ paymentId: string; clientSecret?: string; redirectUrl?: string }> {
    if (provider === 'stripe') {
      if (!this.stripe) throw new Error('Stripe not configured (STRIPE_SECRET_KEY missing)');
      const payment = await this.paymentsRepo.createPayment({
        businessId,
        amountCents,
        currency: 'ILS',
        provider: 'stripe',
        status: 'PENDING',
        campaignId,
      });
      const intent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'ils',
        metadata: { businessId, campaignId: campaignId ?? '', paymentId: payment.id },
      });
      await this.paymentsRepo.updatePayment(payment.id, { providerTxId: intent.id });
      return { paymentId: payment.id, clientSecret: intent.client_secret ?? undefined };
    }

    if (!this.tranzilaTerminal) throw new Error('Tranzila not configured (TRANZILA_TERMINAL missing)');
    const payment = await this.paymentsRepo.createPayment({
      businessId,
      amountCents,
      currency: 'ILS',
      provider: 'tranzila',
      status: 'PENDING',
      campaignId,
    });
    const redirectUrl = `https://direct.tranzila.com/${this.tranzilaTerminal}?sum=${(amountCents / 100).toFixed(2)}&currency=1&cred_type=1`;
    return { paymentId: payment.id, redirectUrl };
  }

  /**
   * Complete a payment and add budget to campaign.
   */
  async completePayment(paymentId: string, providerTxId?: string): Promise<void> {
    const payment = await this.paymentsRepo.findPaymentById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'COMPLETED') return;

    await this.paymentsRepo.updatePayment(paymentId, {
      status: 'COMPLETED',
      providerTxId: providerTxId ?? payment.providerTxId ?? undefined,
    });

    if (payment.campaignId) {
      await this.paymentsRepo.incrementCampaignBudget(payment.campaignId, payment.amountCents);
    }
  }

  /**
   * Calculate driver earnings for a period: COUNT(impressions) * 0.05 ILS.
   */
  async calculateDriverEarnings(driverId: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const count = await this.paymentsRepo.countImpressionsByDriverAndPeriod(
      driverId,
      periodStart,
      periodEnd,
    );
    return count * 0.05;
  }

  /**
   * Generate monthly earnings for all drivers (can be run via cron).
   */
  async generateMonthlyEarnings(periodStart: Date, periodEnd: Date): Promise<void> {
    const drivers = await this.paymentsRepo.findDistinctDriverIdsInPeriod(periodStart, periodEnd);

    for (const { driverId } of drivers) {
      if (!driverId) continue;
      const existing = await this.paymentsRepo.findDriverEarningsByDriverAndPeriod(
        driverId,
        periodStart,
      );
      if (existing) continue;

      const impressionCount = await this.paymentsRepo.countImpressionsByDriverAndPeriod(
        driverId,
        periodStart,
        periodEnd,
      );
      const earningsILS = impressionCount * 0.05;

      await this.paymentsRepo.createDriverEarnings({
        driverId,
        periodStart,
        periodEnd,
        impressionCount,
        earningsILS,
      });
    }
  }

  /**
   * Create a payout request for driver (admin/automated).
   */
  async createPayout(driverId: string, amountILS: number, bankDetails?: unknown): Promise<string> {
    const payout = await this.paymentsRepo.createPayout({ driverId, amountILS, bankDetails });
    return payout.id;
  }

  /**
   * Get payout summary for bank transfer (CSV/JSON for accountant).
   */
  async getPayoutSummary(status = 'pending') {
    return this.paymentsRepo.findPayoutsByStatus(status);
  }

  /**
   * Get driver real-time balance (ILS). Updated on each impression with ratePerReach.
   */
  async getDriverBalance(driverId: string): Promise<number> {
    return this.paymentsRepo.findDriverBalance(driverId);
  }
}
