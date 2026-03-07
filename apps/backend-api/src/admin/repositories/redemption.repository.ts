import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRedemptionData {
  campaignId: string;
  creativeId: string;
  couponCode?: string;
  impressionId?: string;
}

@Injectable()
export class RedemptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async count(): Promise<number> {
    return this.prisma.redemption.count();
  }

  create(data: CreateRedemptionData) {
    return this.prisma.redemption.create({
      data: {
        campaignId: data.campaignId,
        creativeId: data.creativeId,
        couponCode: data.couponCode,
        impressionId: data.impressionId,
      },
    });
  }
}
