import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CampaignStats } from '@prisma/client';

@Injectable()
export class CampaignStatsService {
  private readonly logger = new Logger(CampaignStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async incrementImpressions(campaignId: string, effectiveCpm?: number): Promise<void> {
    const stats = await this.prisma.campaignStats.upsert({
      where: { campaignId },
      create: {
        campaignId,
        impressionCount: 1,
        revenue: effectiveCpm ? effectiveCpm / 1000 : 0,
      },
      update: {
        impressionCount: { increment: 1 },
        revenue: effectiveCpm ? { increment: effectiveCpm / 1000 } : undefined,
        lastComputedAt: new Date(),
      },
    });
    const ctr = stats.impressionCount > 0 ? stats.redemptionCount / stats.impressionCount : 0;
    await this.prisma.campaignStats.update({
      where: { campaignId },
      data: { ctr },
    });
    this.logger.log({
      campaignId,
      impressionCount: stats.impressionCount,
      ctr: +ctr.toFixed(6),
      revenue: stats.revenue,
      msg: 'CampaignStats incrementImpressions',
    });
  }

  async incrementRedemptions(campaignId: string): Promise<void> {
    const stats = await this.prisma.campaignStats.upsert({
      where: { campaignId },
      create: {
        campaignId,
        redemptionCount: 1,
      },
      update: {
        redemptionCount: { increment: 1 },
        lastComputedAt: new Date(),
      },
    });
    const ctr = stats.impressionCount > 0 ? stats.redemptionCount / stats.impressionCount : 0;
    await this.prisma.campaignStats.update({
      where: { campaignId },
      data: { ctr },
    });
    this.logger.log({
      campaignId,
      redemptionCount: stats.redemptionCount,
      impressionCount: stats.impressionCount,
      ctr: +ctr.toFixed(6),
      msg: 'CampaignStats incrementRedemptions',
    });
  }

  async getStats(campaignId: string): Promise<CampaignStats | null> {
    return this.prisma.campaignStats.findUnique({ where: { campaignId } });
  }

  async getBulkStats(campaignIds: string[]): Promise<Map<string, CampaignStats>> {
    if (campaignIds.length === 0) return new Map();
    const rows = await this.prisma.campaignStats.findMany({
      where: { campaignId: { in: campaignIds } },
    });
    return new Map(rows.map((r) => [r.campaignId, r]));
  }

  async recomputeCtr(campaignId: string): Promise<number> {
    const stats = await this.prisma.campaignStats.findUnique({ where: { campaignId } });
    if (!stats) return 0;
    const ctr = stats.impressionCount > 0 ? stats.redemptionCount / stats.impressionCount : 0;
    await this.prisma.campaignStats.update({
      where: { campaignId },
      data: { ctr, lastComputedAt: new Date() },
    });
    return ctr;
  }
}
