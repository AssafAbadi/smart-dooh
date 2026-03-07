import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getRatePerReach(campaignId: string): Promise<number | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { ratePerReach: true },
    });
    return campaign?.ratePerReach ?? null;
  }
}
