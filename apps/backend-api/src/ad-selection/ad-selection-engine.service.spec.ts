import { Test, TestingModule } from '@nestjs/testing';
import { AdSelectionEngineService } from './ad-selection-engine.service';
import { EmergencyRulesStrategy } from './strategies/emergency-rules.strategy';
import { ProximityStrategy } from './strategies/proximity.strategy';
import { PaidPriorityStrategy } from './strategies/paid-priority.strategy';
import { EventBoostStrategy } from './strategies/event-boost.strategy';
import { ContextRulesStrategy } from './strategies/context-rules.strategy';
import type { SelectionInput, CandidateAd } from './interfaces/ad-selection.interface';

describe('AdSelectionEngineService', () => {
  let service: AdSelectionEngineService;
  let emergencyStrategy: jest.Mocked<EmergencyRulesStrategy>;
  let proximityStrategy: jest.Mocked<ProximityStrategy>;
  let paidStrategy: jest.Mocked<PaidPriorityStrategy>;
  let eventBoostStrategy: jest.Mocked<EventBoostStrategy>;
  let contextStrategy: jest.Mocked<ContextRulesStrategy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdSelectionEngineService,
        {
          provide: EmergencyRulesStrategy,
          useValue: { name: 'Emergency', apply: jest.fn() },
        },
        {
          provide: ProximityStrategy,
          useValue: { name: 'Proximity', apply: jest.fn() },
        },
        {
          provide: PaidPriorityStrategy,
          useValue: { name: 'Paid', apply: jest.fn() },
        },
        {
          provide: EventBoostStrategy,
          useValue: { name: 'EventBoost', apply: jest.fn() },
        },
        {
          provide: ContextRulesStrategy,
          useValue: { name: 'Context', apply: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AdSelectionEngineService);
    emergencyStrategy = module.get(EmergencyRulesStrategy);
    proximityStrategy = module.get(ProximityStrategy);
    paidStrategy = module.get(PaidPriorityStrategy);
    eventBoostStrategy = module.get(EventBoostStrategy);
    contextStrategy = module.get(ContextRulesStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockCandidate: CandidateAd = {
    campaignId: 'c1',
    creativeId: 'cr1',
    headline: 'Pizza deal',
    body: null,
    imageUrl: null,
    couponCode: null,
    businessId: 'b1',
    cpm: 100,
    budgetRemaining: 1000,
  };

  const mockInput: SelectionInput = {
    driverId: 'd1',
    lat: 32.08,
    lng: 34.78,
    geohash: 'abc123',
    candidates: [mockCandidate],
    context: { weather: null, timeHour: 12, poiDensity: 0 },
  };

  describe('select (strategy chain)', () => {
    it('should return emergency instruction when EmergencyRulesStrategy overrides', async () => {
      const emergencyInstruction = {
        campaignId: 'emergency',
        creativeId: 'alert-1',
        headline: 'Emergency alert',
        priority: 9999,
      };
      emergencyStrategy.apply.mockResolvedValue({
        override: true,
        instructions: [emergencyInstruction],
      });

      const result = await service.select(mockInput);

      expect(result).toEqual([emergencyInstruction]);
      expect(emergencyStrategy.apply).toHaveBeenCalledWith(mockInput);
      expect(proximityStrategy.apply).not.toHaveBeenCalled();
    });

    it('should run full chain when no override', async () => {
      emergencyStrategy.apply.mockResolvedValue({ override: false, candidates: [mockCandidate] });
      proximityStrategy.apply.mockResolvedValue({ override: false, candidates: [mockCandidate] });
      paidStrategy.apply.mockResolvedValue({ override: false, candidates: [mockCandidate] });
      eventBoostStrategy.apply.mockResolvedValue({ override: false, candidates: [mockCandidate] });
      contextStrategy.apply.mockResolvedValue({ override: false, candidates: [mockCandidate] });

      const result = await service.select(mockInput);

      expect(result).toHaveLength(1);
      expect(result[0].campaignId).toBe('c1');
      expect(emergencyStrategy.apply).toHaveBeenCalled();
      expect(proximityStrategy.apply).toHaveBeenCalled();
      expect(paidStrategy.apply).toHaveBeenCalled();
      expect(eventBoostStrategy.apply).toHaveBeenCalled();
      expect(contextStrategy.apply).toHaveBeenCalled();
    });

    it('should handle empty candidates', async () => {
      const emptyInput = { ...mockInput, candidates: [] };
      emergencyStrategy.apply.mockResolvedValue({ override: false, candidates: [] });
      proximityStrategy.apply.mockResolvedValue({ override: false, candidates: [] });
      paidStrategy.apply.mockResolvedValue({ override: false, candidates: [] });
      eventBoostStrategy.apply.mockResolvedValue({ override: false, candidates: [] });
      contextStrategy.apply.mockResolvedValue({ override: false, candidates: [] });

      const result = await service.select(emptyInput);

      expect(result).toEqual([]);
    });
  });
});
