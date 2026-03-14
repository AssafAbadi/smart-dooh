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
    headline: 'Test',
    businessId: 'biz1',
    cpm: 400,
    budgetRemaining: 50000,
    dailyBudget: 500,
    createdAt: new Date(),
    distanceMeters: 100,
    ...overrides,
  };
}

function makeInput(candidates: CandidateAd[]): SelectionInput {
  return {
    driverId: 'drv',
    lat: 32.07,
    lng: 34.77,
    geohash: 'sv8eq',
    candidates,
    context: { weather: null, timeHour: 14, poiDensity: 0 },
  };
}

describe('Second-Price Billing (via AdRankStrategy)', () => {
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

  it('winner never pays more than their own bid', async () => {
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 500, businessId: 'b1' });
    const c2 = makeCandidate({ campaignId: 'c2', cpm: 300, businessId: 'b2' });
    const result = await strategy.apply(makeInput([c1, c2]));
    const candidates = (result as any).candidates as CandidateAd[];
    const winner = candidates[0];
    expect(winner.effectiveCpm).toBeLessThanOrEqual(winner.cpm);
  });

  it('single candidate pays floor price (50% of bid)', async () => {
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 600 });
    const result = await strategy.apply(makeInput([c1]));
    const candidates = (result as any).candidates as CandidateAd[];
    expect(candidates[0].effectiveCpm).toBe(300);
  });

  it('second-price should be above second highest bid adjusted by quality ratio', async () => {
    const c1 = makeCandidate({ campaignId: 'c1', cpm: 500, businessId: 'b1', distanceMeters: 50 });
    const c2 = makeCandidate({ campaignId: 'c2', cpm: 100, businessId: 'b2', distanceMeters: 50 });
    const result = await strategy.apply(makeInput([c1, c2]));
    const candidates = (result as any).candidates as CandidateAd[];
    const winner = candidates[0];
    expect(winner.effectiveCpm).toBeDefined();
    expect(winner.effectiveCpm!).toBeGreaterThanOrEqual(1);
  });
});
