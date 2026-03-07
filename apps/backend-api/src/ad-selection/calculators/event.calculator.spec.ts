import { Test, TestingModule } from '@nestjs/testing';
import { EventCalculator } from './event.calculator';
import { LiveEventRepository } from '../../impression-estimator/repositories/live-event.repository';

describe('EventCalculator', () => {
  let calculator: EventCalculator;
  let liveEventRepo: jest.Mocked<LiveEventRepository>;

  beforeEach(async () => {
    liveEventRepo = {
      getBoostForLocation: jest.fn(),
    } as unknown as jest.Mocked<LiveEventRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCalculator,
        { provide: LiveEventRepository, useValue: liveEventRepo },
      ],
    }).compile();
    calculator = module.get(EventCalculator);
  });

  it('returns repo getBoostForLocation result', async () => {
    liveEventRepo.getBoostForLocation.mockResolvedValue(1.5);
    const boost = await calculator.getBoostForLocation(32.07, 34.77);
    expect(boost).toBe(1.5);
    expect(liveEventRepo.getBoostForLocation).toHaveBeenCalledWith(32.07, 34.77);
  });

  it('returns 1.0 when no event at location', async () => {
    liveEventRepo.getBoostForLocation.mockResolvedValue(1.0);
    const boost = await calculator.getBoostForLocation(32.0, 35.0);
    expect(boost).toBe(1.0);
  });
});
