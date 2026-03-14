import { Test } from '@nestjs/testing';
import { CampaignStatsService } from './campaign-stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CampaignStatsService', () => {
  let service: CampaignStatsService;
  const mockPrisma = {
    campaignStats: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CampaignStatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CampaignStatsService);
  });

  describe('incrementImpressions', () => {
    it('should upsert stats and update CTR', async () => {
      mockPrisma.campaignStats.upsert.mockResolvedValue({
        campaignId: 'c1',
        impressionCount: 10,
        redemptionCount: 2,
        revenue: 0.5,
      });
      mockPrisma.campaignStats.update.mockResolvedValue({});
      await service.incrementImpressions('c1', 500);
      expect(mockPrisma.campaignStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { campaignId: 'c1' } }),
      );
      expect(mockPrisma.campaignStats.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: 'c1' },
          data: { ctr: 0.2 },
        }),
      );
    });
  });

  describe('incrementRedemptions', () => {
    it('should upsert and recompute CTR', async () => {
      mockPrisma.campaignStats.upsert.mockResolvedValue({
        campaignId: 'c1',
        impressionCount: 50,
        redemptionCount: 5,
      });
      mockPrisma.campaignStats.update.mockResolvedValue({});
      await service.incrementRedemptions('c1');
      expect(mockPrisma.campaignStats.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ctr: 0.1 },
        }),
      );
    });
  });

  describe('getBulkStats', () => {
    it('should return a map keyed by campaignId', async () => {
      const rows = [
        { campaignId: 'c1', impressionCount: 100, ctr: 0.05 },
        { campaignId: 'c2', impressionCount: 50, ctr: 0.02 },
      ];
      mockPrisma.campaignStats.findMany.mockResolvedValue(rows);
      const result = await service.getBulkStats(['c1', 'c2']);
      expect(result.size).toBe(2);
      expect(result.get('c1')?.impressionCount).toBe(100);
      expect(result.get('c2')?.ctr).toBe(0.02);
    });

    it('should return empty map for empty input', async () => {
      const result = await service.getBulkStats([]);
      expect(result.size).toBe(0);
    });
  });

  describe('recomputeCtr', () => {
    it('should return 0 when no stats exist', async () => {
      mockPrisma.campaignStats.findUnique.mockResolvedValue(null);
      expect(await service.recomputeCtr('c1')).toBe(0);
    });

    it('should compute CTR correctly', async () => {
      mockPrisma.campaignStats.findUnique.mockResolvedValue({
        impressionCount: 200,
        redemptionCount: 10,
      });
      mockPrisma.campaignStats.update.mockResolvedValue({});
      const ctr = await service.recomputeCtr('c1');
      expect(ctr).toBe(0.05);
    });
  });
});
