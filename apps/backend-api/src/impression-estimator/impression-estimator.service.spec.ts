import { Test, TestingModule } from '@nestjs/testing';
import { ImpressionEstimatorService } from './impression-estimator.service';
import { LiveEventRepository } from './repositories/live-event.repository';
import { TrafficDensityRepository } from '../traffic-density/repositories/traffic-density.repository';

describe('ImpressionEstimatorService', () => {
  let service: ImpressionEstimatorService;
  let trafficDensityRepo: jest.Mocked<TrafficDensityRepository>;

  beforeEach(async () => {
    trafficDensityRepo = {
      findByGeohashAndTime: jest.fn(),
    } as unknown as jest.Mocked<TrafficDensityRepository>;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpressionEstimatorService,
        { provide: TrafficDensityRepository, useValue: trafficDensityRepo },
        {
          provide: LiveEventRepository,
          useValue: { getBoostForLocation: jest.fn().mockResolvedValue(1.0) },
        },
      ],
    }).compile();
    service = module.get(ImpressionEstimatorService);
  });

  describe('estimate', () => {
    it('should use repo baseDensity and apply time 1.6 for Fri 21:00', async () => {
      trafficDensityRepo.findByGeohashAndTime.mockResolvedValue({ baseDensity: 90 });
      const result = await service.estimate({
        geohash: 'sv8eqh2',
        dayOfWeek: 5,
        hour: 21,
      });
      expect(result.baseDensity).toBe(90);
      expect(result.timeMultiplier).toBe(1.6);
      expect(result.speedFactor).toBe(1.0);
      expect(result.eventTriggerFactor).toBe(1.0);
      expect(result.estimatedReach).toBe(90 * 1.6 * 1.0 * 0.3 * 1.0);
    });

    it('should use default baseDensity when repo returns null', async () => {
      trafficDensityRepo.findByGeohashAndTime.mockResolvedValue(null);
      const result = await service.estimate({
        geohash: 'unknown',
        dayOfWeek: 2,
        hour: 14,
      });
      expect(result.baseDensity).toBe(10);
      expect(result.timeMultiplier).toBe(1.0);
      expect(result.estimatedReach).toBe(10 * 0.3);
    });

    it('should apply speed factor 0.1 when speed > 70 km/h', async () => {
      trafficDensityRepo.findByGeohashAndTime.mockResolvedValue({ baseDensity: 50 });
      const result = await service.estimate({
        geohash: 'x',
        dayOfWeek: 1,
        hour: 12,
        speedKmh: 71,
      });
      expect(result.speedFactor).toBe(0.1);
      expect(result.estimatedReach).toBe(50 * 1.0 * 0.1 * 0.3 * 1.0);
    });

    it('should apply speed factor 2.0 when speed 0 and dwell > 10s', async () => {
      trafficDensityRepo.findByGeohashAndTime.mockResolvedValue({ baseDensity: 20 });
      const result = await service.estimate({
        geohash: 'x',
        dayOfWeek: 3,
        hour: 10,
        speedKmh: 0,
        dwellSeconds: 15,
      });
      expect(result.speedFactor).toBe(2.0);
      expect(result.estimatedReach).toBe(20 * 1.0 * 2.0 * 0.3 * 1.0);
    });

    it('should use time multiplier 1.4 for Sun–Thu 07 or 08', async () => {
      trafficDensityRepo.findByGeohashAndTime.mockResolvedValue({ baseDensity: 40 });
      const result = await service.estimate({
        geohash: 'x',
        dayOfWeek: 0,
        hour: 7,
      });
      expect(result.timeMultiplier).toBe(1.4);
      expect(result.estimatedReach).toBe(40 * 1.4 * 0.3);
    });
  });
});
