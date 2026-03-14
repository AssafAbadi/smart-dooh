import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignStatsService } from '../../ad-selection/services/campaign-stats.service';

export interface CreateRedemptionData {
  campaignId: string;
  creativeId: string;
  couponCode?: string;
  impressionId?: string;
}

@Injectable()
export class RedemptionRepository {
  private readonly logger = new Logger(RedemptionRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignStats: CampaignStatsService,
  ) {}

  async count(): Promise<number> {
    return this.prisma.redemption.count();
  }

  async create(data: CreateRedemptionData) {
    const result = await this.prisma.redemption.create({
      data: {
        campaignId: data.campaignId,
        creativeId: data.creativeId,
        couponCode: data.couponCode,
        impressionId: data.impressionId,
      },
    });
    await this.campaignStats.incrementRedemptions(data.campaignId).catch((err) => {
      this.logger.warn({ campaignId: data.campaignId, err: err?.message, msg: 'Failed to increment redemption stats' });
    });
    return result;
  }
}
