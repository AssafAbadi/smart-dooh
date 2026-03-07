import { Test, TestingModule } from '@nestjs/testing';
import { TOKENS } from '../core/constants/tokens';
import { TimeService } from '../core/time/time.service';
import { ImpressionsService } from './impressions.service';
import { ImpressionsRepository } from './repositories/impressions.repository';
import { MetricsService } from '../observability/metrics.service';
import { ImpressionEstimatorService } from '../impression-estimator/impression-estimator.service';
import { CampaignRepository } from '../campaign/repositories/campaign.repository';
import { DriverRepository } from '../driver/repositories/driver.repository';

describe('ImpressionsService', () => {
  let service: ImpressionsService;
  let repo: jest.Mocked<ImpressionsRepository>;
  let estimator: jest.Mocked<ImpressionEstimatorService>;
  let campaignRepo: jest.Mocked<CampaignRepository>;
  let driverRepo: jest.Mocked<DriverRepository>;

  beforeEach(async () => {
    repo = {
      upsertByClientUuid: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<ImpressionsRepository>;
    estimator = {
      estimate: jest.fn().mockResolvedValue({
        estimatedReach: 50,
        baseDensity: 25,
        timeMultiplier: 1.0,
        speedFactor: 2.0,
        eventTriggerFactor: 1.0,
      }),
    } as unknown as jest.Mocked<ImpressionEstimatorService>;
    campaignRepo = {
      getRatePerReach: jest.fn().mockResolvedValue(0.1),
    } as unknown as jest.Mocked<CampaignRepository>;
    driverRepo = {
      incrementBalance: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DriverRepository>;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpressionsService,
        { provide: ImpressionsRepository, useValue: repo },
        { provide: MetricsService, useValue: { recordImpression: jest.fn() } },
        { provide: ImpressionEstimatorService, useValue: estimator },
        { provide: CampaignRepository, useValue: campaignRepo },
        { provide: DriverRepository, useValue: driverRepo },
        {
          provide: TOKENS.IRedisService,
          useValue: { getClient: () => ({ set: jest.fn().mockResolvedValue('OK') }) },
        },
        {
          provide: TimeService,
          useValue: { getIsraelNow: jest.fn().mockReturnValue({ dayOfWeek: 2, hour: 14, minute: 0 }) },
        },
      ],
    }).compile();
    service = module.get(ImpressionsService);
  });

  describe('recordIdempotent', () => {
    it('should upsert, call estimator, and increment driver balance when ratePerReach and driverId present', async () => {
      await service.recordIdempotent({
        clientUuid: 'u1',
        campaignId: 'c1',
        creativeId: 'cr1',
        deviceId: 'd1',
        driverId: 'dr1',
        lat: 32.08,
        lng: 34.78,
        geohash: 'sv8eqh2',
      });
      expect(repo.upsertByClientUuid).toHaveBeenCalledTimes(1);
      expect(estimator.estimate).toHaveBeenCalledWith(
        expect.objectContaining({
          geohash: 'sv8eqh2',
          dayOfWeek: expect.any(Number),
          hour: expect.any(Number),
        })
      );
      expect(campaignRepo.getRatePerReach).toHaveBeenCalledWith('c1');
      expect(driverRepo.incrementBalance).toHaveBeenCalledWith('dr1', 5);
    });

    it('should not update driver when no driverId', async () => {
      await service.recordIdempotent({
        clientUuid: 'u2',
        campaignId: 'c2',
        creativeId: 'cr2',
        deviceId: 'd2',
        lat: 32,
        lng: 34,
        geohash: 'x',
      });
      expect(driverRepo.incrementBalance).not.toHaveBeenCalled();
    });

    it('should not update driver when campaign has no ratePerReach', async () => {
      campaignRepo.getRatePerReach.mockResolvedValue(null);
      await service.recordIdempotent({
        clientUuid: 'u3',
        campaignId: 'c3',
        creativeId: 'cr3',
        deviceId: 'd3',
        driverId: 'dr3',
        lat: 32,
        lng: 34,
        geohash: 'x',
      });
      expect(driverRepo.incrementBalance).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should delegate to repo', async () => {
      repo.count.mockResolvedValue(42);
      expect(await service.count()).toBe(42);
      expect(await service.count('uuid')).toBe(42);
    });
  });
});
