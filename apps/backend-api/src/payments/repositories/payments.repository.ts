import { Injectable } from '@nestjs/common';
import type { Payment, DriverEarnings, Payout } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository, type PrismaDelegateLike } from '../../core/repositories/base.repository';

export interface CreatePaymentData {
  businessId: string;
  amountCents: number;
  currency?: string;
  provider: string;
  status: string;
  campaignId?: string;
}

export interface CreateDriverEarningsData {
  driverId: string;
  periodStart: Date;
  periodEnd: Date;
  impressionCount: number;
  earningsILS: number;
}

@Injectable()
export class PaymentsRepository extends BaseRepository<Payment> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(): PrismaDelegateLike {
    return this.prisma.payment;
  }

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    return this.createOne({ data });
  }

  async updatePayment(
    id: string,
    data: { status?: string; providerTxId?: string },
  ): Promise<Payment> {
    return this.update({ where: { id }, data });
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.findUnique({ where: { id } });
  }

  async incrementCampaignBudget(campaignId: string, amountCents: number): Promise<void> {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { budgetRemaining: { increment: amountCents } },
    });
  }

  async countImpressionsByDriverAndPeriod(
    driverId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return this.prisma.impression.count({
      where: { driverId, createdAt: { gte: periodStart, lte: periodEnd } },
    });
  }

  async findDistinctDriverIdsInPeriod(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ driverId: string | null }[]> {
    return this.prisma.impression.findMany({
      where: { driverId: { not: null }, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { driverId: true },
      distinct: ['driverId'],
    });
  }

  async findDriverEarningsByDriverAndPeriod(
    driverId: string,
    periodStart: Date,
  ): Promise<DriverEarnings | null> {
    return this.prisma.driverEarnings.findUnique({
      where: { driverId_periodStart: { driverId, periodStart } },
    });
  }

  async createDriverEarnings(data: CreateDriverEarningsData): Promise<DriverEarnings> {
    return this.prisma.driverEarnings.create({ data });
  }

  async createPayout(data: {
    driverId: string;
    amountILS: number;
    bankDetails?: unknown;
  }): Promise<Payout> {
    return this.prisma.payout.create({
      data: { ...data, bankDetails: data.bankDetails as never },
    });
  }

  async findPayoutsByStatus(status: string): Promise<Payout[]> {
    return this.prisma.payout.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDriverBalance(driverId: string): Promise<number> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { balance: true },
    });
    return driver?.balance ?? 0;
  }
}
