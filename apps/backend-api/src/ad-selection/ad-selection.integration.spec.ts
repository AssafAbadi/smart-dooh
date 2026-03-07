import { Test, TestingModule } from '@nestjs/testing';
import { EventBoostStrategy } from './strategies/event-boost.strategy';
import { EventCalculator } from './calculators/event.calculator';
import { LiveEventRepository } from '../impression-estimator/repositories/live-event.repository';
import type { SelectionInput, CandidateAd } from './interfaces/ad-selection.interface';
import { ContextRulesStrategy } from './strategies/context-rules.strategy';
import { WeatherCalculator } from './calculators/weather.calculator';
import { TargetingPreferencesRepository } from './repositories/targeting-preferences.repository';

describe('AdSelection integration', () => {
  describe('EventBoostStrategy (LiveEvent multiplier)', () => {
    let strategy: EventBoostStrategy;
    let liveEventRepo: jest.Mocked<LiveEventRepository>;

    beforeEach(async () => {
      liveEventRepo = {
        getBoostForLocation: jest.fn().mockResolvedValue(1.5),
      } as unknown as jest.Mocked<LiveEventRepository>;

      const module = await Test.createTestingModule({
        providers: [
          EventBoostStrategy,
          EventCalculator,
          { provide: LiveEventRepository, useValue: liveEventRepo },
        ],
      }).compile();

      strategy = module.get(EventBoostStrategy);
    });

    it('multiplies candidate priority by event boost when near Bloomfield-style event', async () => {
      const bloomfieldLat = 32.0695;
      const bloomfieldLng = 34.7745;
      const candidates: CandidateAd[] = [
        {
          campaignId: 'c1',
          creativeId: 'cr1',
          headline: 'Ad',
          businessId: 'b1',
          cpm: 100,
          budgetRemaining: 1000,
          priority: 100,
        },
      ];
      const input: SelectionInput = {
        driverId: 'd1',
        lat: bloomfieldLat,
        lng: bloomfieldLng,
        geohash: 'sv8eqh2',
        candidates,
        context: { weather: null, timeHour: 12, poiDensity: 0 },
      };

      const result = await strategy.apply(input);

      expect(result.override).toBe(false);
      if (result.override === false) {
        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0].priority).toBe(150); // 100 * 1.5
      }
      expect(liveEventRepo.getBoostForLocation).toHaveBeenCalledWith(bloomfieldLat, bloomfieldLng);
    });
  });

  describe('ContextRulesStrategy (Rain / soup ad priority)', () => {
    let strategy: ContextRulesStrategy;
    let targetingRepo: jest.Mocked<TargetingPreferencesRepository>;

    beforeEach(async () => {
      targetingRepo = {
        findByBusinessIds: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<TargetingPreferencesRepository>;

      const module = await Test.createTestingModule({
        providers: [
          ContextRulesStrategy,
          WeatherCalculator,
          { provide: TargetingPreferencesRepository, useValue: targetingRepo },
        ],
      }).compile();

      strategy = module.get(ContextRulesStrategy);
    });

    it('scores soup candidate higher than ice cream when weather is Rain and cold', async () => {
      const soupCandidate: CandidateAd = {
        campaignId: 'c1',
        creativeId: 'cr1',
        headline: 'Hot soup today',
        body: 'Warm up with soup',
        businessId: 'b1',
        cpm: 100,
        budgetRemaining: 1000,
        priority: 0,
      };
      const iceCandidate: CandidateAd = {
        campaignId: 'c2',
        creativeId: 'cr2',
        headline: 'Ice cream',
        body: 'Cold dessert',
        businessId: 'b2',
        cpm: 100,
        budgetRemaining: 1000,
        priority: 0,
      };
      const input: SelectionInput = {
        driverId: 'd1',
        lat: 32.08,
        lng: 34.78,
        geohash: 'sv8eqh2',
        candidates: [iceCandidate, soupCandidate],
        context: {
          weather: { tempCelsius: 12, condition: 'Rain' },
          timeHour: 12,
          poiDensity: 0,
        },
      };

      const result = await strategy.apply(input);

      expect(result.override).toBe(false);
      if (result.override === false) {
        expect(result.candidates).toHaveLength(2);
        const soupResult = result.candidates.find((c) => c.businessId === 'b1');
        const iceResult = result.candidates.find((c) => c.businessId === 'b2');
        expect(soupResult!.priority).toBeGreaterThan(iceResult!.priority);
      }
    });
  });
});
