import { z } from 'zod';

export const createIntentBodySchema = z.object({
  businessId: z.string().min(1),
  amountCents: z.number(),
  provider: z.enum(['stripe', 'tranzila']),
  campaignId: z.string().optional(),
});

export const completePaymentBodySchema = z.object({
  providerTxId: z.string().optional(),
});

export const driverEarningsQuerySchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export const generateEarningsBodySchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export const createPayoutBodySchema = z.object({
  driverId: z.string().min(1),
  amountILS: z.number(),
  bankDetails: z.unknown().optional(),
});

export const payoutSummaryQuerySchema = z.object({
  status: z.string().optional().default('pending'),
});

export type CreateIntentBodyDto = z.infer<typeof createIntentBodySchema>;
export type CompletePaymentBodyDto = z.infer<typeof completePaymentBodySchema>;
export type DriverEarningsQueryDto = z.infer<typeof driverEarningsQuerySchema>;
export type GenerateEarningsBodyDto = z.infer<typeof generateEarningsBodySchema>;
export type CreatePayoutBodyDto = z.infer<typeof createPayoutBodySchema>;
export type PayoutSummaryQueryDto = z.infer<typeof payoutSummaryQuerySchema>;
