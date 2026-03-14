import { Test } from '@nestjs/testing';
import { BudgetPacingService } from './budget-pacing.service';
import { TOKENS } from '../../core/constants/tokens';

describe('BudgetPacingService', () => {
  let service: BudgetPacingService;

  const mockRedisClient = {
    get: jest.fn(),
    incrby: jest.fn((_key: string, amount: number) => Promise.resolve(amount)),
    expire: jest.fn(() => Promise.resolve(1)),
  };

  const mockRedis = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BudgetPacingService,
        { provide: TOKENS.IRedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(BudgetPacingService);
  });

  it('should return 1.0 when no daily budget', async () => {
    const factor = await service.getPacingFactor('c1', null);
    expect(factor).toBe(1.0);
  });

  it('should return factor close to 1.0 when under budget', async () => {
    mockRedisClient.get.mockResolvedValue('1');
    const factor = await service.getPacingFactor('c1', 240);
    expect(factor).toBeGreaterThan(0.8);
    expect(factor).toBeLessThanOrEqual(1.0);
  });

  it('should return factor close to 0.1 when at budget', async () => {
    // hourlyBudget = 240/24 = 10; spend stored as millicents, so 10000 = 10 units
    mockRedisClient.get.mockResolvedValue('10000');
    const factor = await service.getPacingFactor('c1', 240);
    expect(factor).toBe(0.1);
  });

  it('should clamp at 0.1 when over budget', async () => {
    mockRedisClient.get.mockResolvedValue('15000'); // 15 units > hourly budget 10
    const factor = await service.getPacingFactor('c1', 240);
    expect(factor).toBe(0.1);
  });

  it('should record spend in Redis', async () => {
    await service.recordSpend('c1', 500);
    expect(mockRedisClient.incrby).toHaveBeenCalled();
  });
});
