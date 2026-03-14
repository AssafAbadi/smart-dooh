import { Test } from '@nestjs/testing';
import { ShareOfVoiceService } from './share-of-voice.service';
import { TOKENS } from '../../core/constants/tokens';

function currentHourKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}H${String(now.getUTCHours()).padStart(2, '0')}`;
}

describe('ShareOfVoiceService', () => {
  let service: ShareOfVoiceService;

  const mockRedisClient = {
    get: jest.fn(),
    incr: jest.fn(() => Promise.resolve(1)),
    expire: jest.fn(() => Promise.resolve(1)),
    scan: jest.fn((_cursor: string) => Promise.resolve(['0', [] as string[]])),
    mget: jest.fn(() => Promise.resolve([])),
  };

  const mockRedis = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShareOfVoiceService,
        { provide: TOKENS.IRedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(ShareOfVoiceService);
  });

  it('should return 1.0 when no impressions exist', async () => {
    mockRedisClient.scan.mockResolvedValue(['0', []]);
    const penalty = await service.getSovPenalty('biz1', 'sv8eq');
    expect(penalty).toBe(1.0);
  });

  it('should return 1.0 when business share is under 30%', async () => {
    const hk = currentHourKey();
    const keys = [
      `sov:biz1:sv8eq:${hk}`,
      `sov:biz2:sv8eq:${hk}`,
      `sov:biz3:sv8eq:${hk}`,
    ];
    mockRedisClient.scan.mockResolvedValue(['0', keys]);
    mockRedisClient.mget.mockResolvedValue(['10', '50', '40']);
    const penalty = await service.getSovPenalty('biz1', 'sv8eq');
    expect(penalty).toBe(1.0);
  });

  it('should return penalty between 0.3 and 1.0 when share is between 30-40%', async () => {
    const hk = currentHourKey();
    const keys = [`sov:biz1:sv8eq:${hk}`, `sov:biz2:sv8eq:${hk}`];
    mockRedisClient.scan.mockResolvedValue(['0', keys]);
    mockRedisClient.mget.mockResolvedValue(['35', '65']); // 35% share -> penalty ~0.65
    const penalty = await service.getSovPenalty('biz1', 'sv8eq');
    expect(penalty).toBeGreaterThanOrEqual(0.3);
    expect(penalty).toBeLessThanOrEqual(1.0);
    expect(penalty).toBeCloseTo(0.65, 2);
  });

  it('should return 0.3 when share exceeds 40%', async () => {
    const hk = currentHourKey();
    const keys = [`sov:biz1:sv8eq:${hk}`, `sov:biz2:sv8eq:${hk}`];
    mockRedisClient.scan.mockResolvedValue(['0', keys]);
    mockRedisClient.mget.mockResolvedValue(['60', '40']);
    const penalty = await service.getSovPenalty('biz1', 'sv8eq');
    expect(penalty).toBe(0.3);
  });

  it('should not interfere between different areas', async () => {
    mockRedisClient.scan.mockResolvedValue(['0', []]);
    const penalty = await service.getSovPenalty('biz1', 'other');
    expect(penalty).toBe(1.0);
  });

  it('should record impression and set TTL', async () => {
    await service.recordImpression('biz1', 'sv8eq');
    expect(mockRedisClient.incr).toHaveBeenCalled();
    expect(mockRedisClient.expire).toHaveBeenCalled();
  });
});
