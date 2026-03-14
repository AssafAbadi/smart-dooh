import { Test, TestingModule } from '@nestjs/testing';
import { TOKENS } from '../core/constants/tokens';
import { ImpressionsService } from './impressions.service';
import { ImpressionsRepository } from './repositories/impressions.repository';
import { MetricsService } from '../observability/metrics.service';
import { ImpressionEstimatorService } from '../impression-estimator/impression-estimator.service';
import { CampaignRepository } from '../campaign/repositories/campaign.repository';
import { DriverRepository } from '../driver/repositories/driver.repository';
import { TimeService } from '../core/time/time.service';
import { CampaignStatsService } from '../ad-selection/services/campaign-stats.service';
import { FrequencyCapService } from '../ad-selection/services/frequency-cap.service';
import { BudgetPacingService } from '../ad-selection/services/budget-pacing.service';
import { ShareOfVoiceService } from '../ad-selection/services/share-of-voice.service';

describe('ImpressionsService frequency capping', () => {
  let service: ImpressionsService;
  let repo: jest.Mocked<ImpressionsRepository>;
  let driverRepo: jest.Mocked<DriverRepository>;
  let setMock: jest.Mock;

  beforeEach(async () => {
    repo = {
      upsertByClientUuid: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<ImpressionsRepository>;

    setMock = jest.fn();
    const redisClient = { set: setMock };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpressionsService,
        { provide: ImpressionsRepository, useValue: repo },
        { provide: MetricsService, useValue: { recordImpression: jest.fn() } },
        {
          provide: ImpressionEstimatorService,
          useValue: {
            estimate: jest.fn().mockResolvedValue({
              estimatedReach: 50,
              baseDensity: 25,
              timeMultiplier: 1.0,
              speedFactor: 1.0,
              eventTriggerFactor: 1.0,
            }),
          },
        },
        { provide: CampaignRepository, useValue: { getRatePerReach: jest.fn().mockResolvedValue(0.1) } },
        { provide: DriverRepository, useValue: { incrementBalance: jest.fn().mockResolvedValue(undefined) } },
        { provide: TimeService, useValue: { getIsraelNow: jest.fn().mockReturnValue({ dayOfWeek: 2, hour: 14, minute: 0 }) } },
        {
          provide: TOKENS.IRedisService,
          useValue: { getClient: () => redisClient },
        },
        { provide: CampaignStatsService, useValue: { incrementImpressions: jest.fn().mockResolvedValue(undefined) } },
        { provide: FrequencyCapService, useValue: { recordImpression: jest.fn().mockResolvedValue(undefined) } },
        { provide: BudgetPacingService, useValue: { recordSpend: jest.fn().mockResolvedValue(undefined) } },
        { provide: ShareOfVoiceService, useValue: { recordImpression: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(ImpressionsService);
    driverRepo = module.get(DriverRepository);
  });

  it('second identical impression within 15s is throttled (no driver balance increment)', async () => {
    setMock
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce(null);

    const payload = {
      clientUuid: 'uuid-unique-1',
      campaignId: 'camp1',
      creativeId: 'cr1',
      deviceId: 'dev1',
      driverId: 'dr1',
      lat: 32.08,
      lng: 34.78,
      geohash: 'sv8eqh2',
    };

    await service.recordIdempotent(payload);
    await service.recordIdempotent(payload);

    expect(repo.upsertByClientUuid).toHaveBeenCalledTimes(1);
    expect(driverRepo.incrementBalance).toHaveBeenCalledTimes(1);
  });
});
