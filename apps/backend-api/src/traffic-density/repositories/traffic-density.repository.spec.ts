import { Test, TestingModule } from '@nestjs/testing';
import { TrafficDensityRepository } from './traffic-density.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TOKENS } from '../../core/constants/tokens';

describe('TrafficDensityRepository', () => {
  let repo: TrafficDensityRepository;
  let prisma: { trafficDensity: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      trafficDensity: {
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrafficDensityRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: TOKENS.IRedisService, useValue: { getClient: () => null } },
      ],
    }).compile();
    repo = module.get(TrafficDensityRepository);
  });

  describe('findByGeohashAndTime', () => {
    it('should normalize geohash to 7 chars and return baseDensity when row exists', async () => {
      prisma.trafficDensity.findUnique.mockResolvedValue({ baseDensity: 85 });
      const result = await repo.findByGeohashAndTime('sv8eqh2xyz', 5, 21);
      expect(prisma.trafficDensity.findUnique).toHaveBeenCalledWith({
        where: {
          geohash_dayOfWeek_hour: { geohash: 'sv8eqh2', dayOfWeek: 5, hour: 21 },
        },
        select: { baseDensity: true },
      });
      expect(result).toEqual({ baseDensity: 85 });
    });

    it('should return null when no row exists', async () => {
      prisma.trafficDensity.findUnique.mockResolvedValue(null);
      const result = await repo.findByGeohashAndTime('unknown1', 0, 12);
      expect(result).toBeNull();
    });
  });
});
