import { Test } from '@nestjs/testing';
import { FrequencyCapService } from './frequency-cap.service';
import { TOKENS } from '../../core/constants/tokens';

describe('FrequencyCapService', () => {
  let service: FrequencyCapService;
  const store: Record<string, string> = {};

  const mockRedisClient = {
    get: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    mget: jest.fn((...keys: string[]) =>
      Promise.resolve(keys.map((k) => store[k] ?? null)),
    ),
    incr: jest.fn((key: string) => {
      const val = parseInt(store[key] ?? '0', 10) + 1;
      store[key] = String(val);
      return Promise.resolve(val);
    }),
    expire: jest.fn(() => Promise.resolve(1)),
  };

  const mockRedis = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(store).forEach((k) => delete store[k]);
    const module = await Test.createTestingModule({
      providers: [
        FrequencyCapService,
        { provide: TOKENS.IRedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(FrequencyCapService);
  });

  it('should allow campaigns under the limit', async () => {
    const { allowed, capped } = await service.filterCapped(['c1', 'c2'], 'dev1', 'sv8eq');
    expect(allowed).toEqual(['c1', 'c2']);
    expect(capped).toEqual([]);
  });

  it('should cap campaigns at the device hourly limit', async () => {
    // filterCapped uses mget(devKey, areaKey); dev count 3 triggers cap
    mockRedisClient.mget.mockResolvedValue(['3', '0']);
    const { allowed, capped } = await service.filterCapped(['c1'], 'dev1', 'sv8eq');
    expect(allowed).toEqual([]);
    expect(capped).toEqual(['c1']);
  });

  it('should cap campaigns at the area daily limit', async () => {
    // mget returns [devCount, areaCount]; area count 20 triggers cap
    mockRedisClient.mget.mockResolvedValue(['0', '20']);
    const { allowed, capped } = await service.filterCapped(['c1'], 'dev1', 'sv8eq');
    expect(allowed).toEqual([]);
    expect(capped).toEqual(['c1']);
  });

  it('should not interfere between different devices', async () => {
    mockRedisClient.mget.mockResolvedValueOnce(['3', '0']); // dev1 capped
    const { allowed: dev1 } = await service.filterCapped(['c1'], 'dev1', 'sv8eq');
    expect(dev1).toEqual([]);
    mockRedisClient.mget.mockResolvedValueOnce(['0', '0']); // dev2 not capped
    const { allowed: dev2 } = await service.filterCapped(['c1'], 'dev2', 'sv8eq');
    expect(dev2).toEqual(['c1']);
  });

  it('should record impression and set TTL', async () => {
    await service.recordImpression('c1', 'dev1', 'sv8eq');
    expect(mockRedisClient.incr).toHaveBeenCalledTimes(2);
    expect(mockRedisClient.expire).toHaveBeenCalled();
  });
});
