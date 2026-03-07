import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AnalyticsRawData {
  impressionsTotal: number;
  redemptionsTotal: number;
  distinctLocations: number;
}

/**
 * Encapsulates raw SQL and counts for admin analytics.
 * OTS formula uses distinct (lat,lng) rounded to 5 decimals as location hash.
 */
@Injectable()
export class AdminAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalyticsRawData(): Promise<AnalyticsRawData> {
    const [impressionsTotal, redemptionsTotal, distinctResult] = await Promise.all([
      this.prisma.impression.count(),
      this.prisma.redemption.count(),
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT md5(round("lat"::numeric, 5)::text || '|' || round("lng"::numeric, 5)::text))::bigint AS count
        FROM "Impression"
      `,
    ]);

    const distinctLocations = Number(distinctResult[0]?.count ?? 0);

    return {
      impressionsTotal,
      redemptionsTotal,
      distinctLocations,
    };
  }
}
