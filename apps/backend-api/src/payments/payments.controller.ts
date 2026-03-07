import { Body, Controller, Get, Logger, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  completePaymentBodySchema,
  createIntentBodySchema,
  createPayoutBodySchema,
  driverEarningsQuerySchema,
  generateEarningsBodySchema,
  payoutSummaryQuerySchema,
  type CompletePaymentBodyDto,
  type CreateIntentBodyDto,
  type CreatePayoutBodyDto,
  type DriverEarningsQueryDto,
  type GenerateEarningsBodyDto,
  type PayoutSummaryQueryDto,
} from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { AdminApiKeyGuard } from '../admin/guards/admin-api-key.guard';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly payments: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create payment intent (Stripe or Tranzila)' })
  @UsePipes(new ZodValidationPipe(createIntentBodySchema))
  async createIntent(@Body() body: CreateIntentBodyDto) {
    return this.payments.createPaymentIntent(
      body.businessId,
      body.amountCents,
      body.provider,
      body.campaignId
    );
  }

  @Post('complete/:paymentId')
  @ApiOperation({ summary: 'Complete a payment' })
  @UsePipes(new ZodValidationPipe(completePaymentBodySchema))
  async complete(
    @Param('paymentId') paymentId: string,
    @Body() body: CompletePaymentBodyDto
  ) {
    await this.payments.completePayment(paymentId, body.providerTxId);
    return { completed: true };
  }

  @Get('driver/:driverId/balance')
  @ApiOperation({ summary: 'Get driver balance' })
  async getDriverBalance(@Param('driverId') driverId: string) {
    this.logger.log({ driverId, msg: 'GET driver balance requested' });
    const balance = await this.payments.getDriverBalance(driverId);
    this.logger.log({ driverId, balance, msg: 'GET driver balance response' });
    return { balance };
  }

  @Get('driver-earnings/:driverId')
  @ApiOperation({ summary: 'Get driver earnings for period' })
  async getDriverEarnings(
    @Param('driverId') driverId: string,
    @Query(new ZodValidationPipe(driverEarningsQuerySchema)) query: DriverEarningsQueryDto
  ) {
    const periodStart = new Date(query.periodStart);
    const periodEnd = new Date(query.periodEnd);
    this.logger.log({
      driverId,
      periodStart: query.periodStart,
      periodEnd: query.periodEnd,
      msg: 'GET driver-earnings requested',
    });
    const earningsILS = await this.payments.calculateDriverEarnings(driverId, periodStart, periodEnd);
    this.logger.log({ driverId, periodStart, periodEnd, earningsILS, msg: 'GET driver-earnings response' });
    return { driverId, periodStart, periodEnd, earningsILS };
  }

  @Post('admin/generate-earnings')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Generate monthly earnings (admin)' })
  @UsePipes(new ZodValidationPipe(generateEarningsBodySchema))
  async generateEarnings(@Body() body: GenerateEarningsBodyDto) {
    await this.payments.generateMonthlyEarnings(new Date(body.periodStart), new Date(body.periodEnd));
    return { generated: true };
  }

  @Post('admin/create-payout')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Create payout (admin)' })
  @UsePipes(new ZodValidationPipe(createPayoutBodySchema))
  async createPayout(@Body() body: CreatePayoutBodyDto) {
    const payoutId = await this.payments.createPayout(
      body.driverId,
      body.amountILS,
      body.bankDetails
    );
    return { payoutId };
  }

  @Get('admin/payout-summary')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Get payout summary (admin)' })
  async getPayoutSummary(
    @Query(new ZodValidationPipe(payoutSummaryQuerySchema)) query: PayoutSummaryQueryDto
  ) {
    const payouts = await this.payments.getPayoutSummary(query.status);
    return { payouts };
  }
}
