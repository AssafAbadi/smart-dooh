import { Test } from '@nestjs/testing';
import { AdRankStrategy } from './ad-rank.strategy';
import { CampaignStatsService } from '../services/campaign-stats.service';
import { QualityScoreCalculator } from '../calculators/quality-score.calculator';
import { RelevanceCalculator } from '../calculators/relevance.calculator';
import { SecondPriceCalculator } from '../calculators/second-price.calculator';
import { BudgetPacingService } from '../services/budget-pacing.service';
import { FrequencyCapService } from '../services/frequency-cap.service';
import { ShareOfVoiceService } from '../services/share-of-voice.service';
import { WeightedSamplerService } from '../services/weighted-sampler.service';
import { ExplorationSelector } from '../selectors/exploration.selector';
import { TimeService } from '../../core/time/time.service';
import type { CandidateAd, SelectionInput } from '../interfaces/ad-selection.interface';

function makeCandidate(overrides: Partial<CandidateAd> = {}): CandidateAd {
  return {
    campaignId: 'c1',
    creativeId: 'cr1',
    headline: 'Test Ad',
    businessId: 'biz1',
    cpm: 400,
    budgetRemaining: 10000,
    dailyBudget: 500,
    createdAt: new Date(),
    distanceMeters: 100,
    ...overrides,
  };
}

function makeInput(candidates: CandidateAd[]): SelectionInput {
  return {
    driverId: 'driver-1',
    lat: 32.07,
    lng: 34.77,
    geohash: 'sv8eq',
    candidates,
    context: {
      weather: { tempCelsius: 22, condition: 'Clear' },
      timeHour: 14,
      poiDensity: 3,
    },
  };
}

describe('AdRankStrategy', () => {
  let strategy: AdRankStrategy;
  let randomSpy: jest.SpyInstance;

  beforeEach(async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const module = await Test.createTestingModule({
      providers: [
        AdRankStrategy,
        {
          provide: CampaignStatsService,
          useValue: { getBulkStats: jest.fn().mockResolvedValue(new Map()) },
        },
        {
          provide: TimeService,
          useValue: { nowMillis: jest.fn().mockReturnValue(Date.now()), getIsraelNow: jest.fn().mockReturnValue({ dayOfWeek: 3, hour: 14, minute: 0 }) },
        },
        QualityScoreCalculator,
        RelevanceCalculator,
        SecondPriceCalculator,
        WeightedSamplerService,
        ExplorationSelector,
        {
          provide: BudgetPacingService,
          useValue: { getPacingFactor: jest.fn().mockResolvedValue(1.0) },
        },
        {
          provide: FrequencyCapService,
          useValue: {
            filterCapped: jest.fn().mockImplementation(async (ids: string[]) => ({
              allowed: ids,
              capped: [],
            })),
          },
        },
        {
          provide: ShareOfVoiceService,
          useValue: { getSovPenalty: jest.fn().mockResolvedValue(1.0) },
        },
      ],
    }).compile();
    strategy = module.get(AdRankStrategy);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('should return empty candidates for empty input', async () => {
    const result = await strategy.apply(makeInput([]));
    expect(result.override).toBe(false);
    expect((result as any).candidates).toEqual([]);
  });

  it('should rank higher-quality candidates above lower-quality', async () => {
    const highQuality = makeCandidate({
      campaignId: 'c-high',
      businessId: 'biz-h',
      cpm: 300,
      budgetRemaining: 50000,
      distanceMeters: 20,
    });
    const lowQuality = makeCandidate({
      campaignId: 'c-low',
      businessId: 'biz-l',
      cpm: 500,
      budgetRemaining: 100,
      distanceMeters: 2000,
    });
    const input = makeInput([highQuality, lowQuality]);
    const result = await strategy.apply(input);
    expect(result.override).toBe(false);
    expect((result as any).candidates.length).toBe(2);
  });

  it('should compute effectiveCpm for the winner using second-price', async () => {
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 500, businessId: 'b1', distanceMeters: 50 });
    const c2 = makeCandidate({ campaignId: 'c2', cpm: 300, businessId: 'b2', distanceMeters: 50 });
    const result = await strategy.apply(makeInput([c1, c2]));
    const candidates = (result as any).candidates as CandidateAd[];
    const winner = candidates[0];
    expect(winner.effectiveCpm).toBeDefined();
    expect(winner.effectiveCpm!).toBeLessThanOrEqual(winner.cpm);
  });

  it('should set effectiveCpm for single candidate at 50% of bid', async () => {
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 400 });
    const result = await strategy.apply(makeInput([c1]));
    const candidates = (result as any).candidates as CandidateAd[];
    expect(candidates[0].effectiveCpm).toBe(200);
  });

  it('produces deterministic results with mocked Math.random', async () => {
    randomSpy.mockReturnValue(0.1);
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 400, businessId: 'b1' });
    const c2 = makeCandidate({ campaignId: 'c2', cpm: 300, businessId: 'b2' });
    const r1 = await strategy.apply(makeInput([c1, c2]));
    const r2 = await strategy.apply(makeInput([c1, c2]));
    const ids1 = ((r1 as any).candidates as CandidateAd[]).map((c) => c.campaignId);
    const ids2 = ((r2 as any).candidates as CandidateAd[]).map((c) => c.campaignId);
    expect(ids1).toEqual(ids2);
  });
});
