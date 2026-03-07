import { Injectable } from '@nestjs/common';
import { AdminAnalyticsRepository } from './repositories/admin-analytics.repository';

export interface AnalyticsResult {
  ots: number;
  conversionRatePercent: number;
  distinctLocations: number;
  impressionsTotal: number;
  redemptionsTotal: number;
}

/** OTS formula: COUNT(DISTINCT lat_hash) * 50 * 0.7. We use distinct (lat,lng) rounded to 5 decimals as location hash. */
@Injectable()
export class AdminService {
  constructor(private readonly adminAnalyticsRepository: AdminAnalyticsRepository) {}

  async getAnalytics(): Promise<AnalyticsResult> {
    const { impressionsTotal, redemptionsTotal, distinctLocations } =
      await this.adminAnalyticsRepository.getAnalyticsRawData();

    const ots = distinctLocations * 50 * 0.7;
    const conversionRatePercent =
      impressionsTotal > 0 ? (redemptionsTotal / impressionsTotal) * 100 : 0;

    return {
      ots: Math.round(ots * 100) / 100,
      conversionRatePercent: Math.round(conversionRatePercent * 100) / 100,
      distinctLocations,
      impressionsTotal,
      redemptionsTotal,
    };
  }
}
