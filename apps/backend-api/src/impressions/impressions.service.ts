import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { toGeohash7 } from '../core/utils/geohash.util';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TimeService } from '../core/time/time.service';
import { MetricsService } from '../observability/metrics.service';
import { ImpressionsRepository } from './repositories/impressions.repository';
import type { RecordImpressionInput } from './repositories/impressions.repository';
import { ImpressionEstimatorService } from '../impression-estimator/impression-estimator.service';
import { CampaignRepository } from '../campaign/repositories/campaign.repository';
import { DriverRepository } from '../driver/repositories/driver.repository';

const THROTTLE_TTL_SEC = 15;
const THROTTLE_KEY_PREFIX = 'throttle:';

@Injectable()
export class ImpressionsService {
  private readonly logger = new Logger(ImpressionsService.name);

  constructor(
    private readonly repo: ImpressionsRepository,
    private readonly metrics: MetricsService,
    private readonly estimator: ImpressionEstimatorService,
    private readonly campaignRepo: CampaignRepository,
    private readonly driverRepo: DriverRepository,
    private readonly time: TimeService,
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  async recordIdempotent(input: RecordImpressionInput): Promise<void> {
    if (input.driverId) {
      const geo = toGeohash7(input.geohash ?? '');
      const allowed = await this.tryThrottle(input.driverId, input.campaignId, geo);
      if (!allowed) {
        this.logger.log({ driverId: input.driverId, campaignId: input.campaignId, geohash: geo, msg: 'recordIdempotent throttled, skip' });
        return;
      }
    }

    await this.repo.upsertByClientUuid(input);
    this.metrics.recordImpression(input.campaignId);

    const israel = this.time.getIsraelNow();
    const estimateResult = await this.estimator.estimate({
      geohash: input.geohash,
      dayOfWeek: israel.dayOfWeek,
      hour: israel.hour,
      minute: israel.minute,
      lat: input.lat,
      lng: input.lng,
      speedKmh: input.speedKmh,
      dwellSeconds: input.dwellSeconds,
    });

    const ratePerReach = await this.campaignRepo.getRatePerReach(input.campaignId);
    const revenue =
      ratePerReach != null ? estimateResult.estimatedReach * ratePerReach : 0;

    if (revenue > 0 && input.driverId) {
      await this.driverRepo.incrementBalance(input.driverId, revenue);
      this.logger.log({
        driverId: input.driverId,
        reach: estimateResult.estimatedReach,
        ratePerReach,
        revenue,
        msg: 'recordIdempotent driver revenue',
      });
    } else if (ratePerReach == null) {
      this.logger.log({ campaignId: input.campaignId, driverId: input.driverId ?? null, msg: 'recordIdempotent no ratePerReach, skip revenue' });
    } else if (!input.driverId && revenue > 0) {
      this.logger.log({ campaignId: input.campaignId, revenue, msg: 'recordIdempotent revenue>0 but no driverId, skip balance update' });
    }
  }

  async count(byClientUuid?: string): Promise<number> {
    return this.repo.count(byClientUuid);
  }

  /**
   * Redis throttle: SET key NX EX 15. Key is driverId:campaignId:geohash so the same ad at
   * different locations (e.g. simulator route points) each count; only duplicate same-ad-at-same-place within 15s is skipped.
   */
  private async tryThrottle(driverId: string, campaignId: string, geohash7: string): Promise<boolean> {
    const client = this.redis.getClient() as { set: (key: string, value: string, ...args: unknown[]) => Promise<string | null> } | null;
    if (!client) return true; // fail-open
    const key = `${THROTTLE_KEY_PREFIX}${driverId}:${campaignId}:${geohash7 || 'n'}`;
    try {
      const result = await client.set(key, '1', 'EX', THROTTLE_TTL_SEC, 'NX');
      return result === 'OK';
    } catch {
      return true; // fail-open on Redis error
    }
  }
}
