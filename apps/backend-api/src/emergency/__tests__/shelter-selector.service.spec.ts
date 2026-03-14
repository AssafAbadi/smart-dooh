import { ShelterSelectorService } from '../shelter-selector.service';
import type { ShelterWithDistance } from '../../shelter/interfaces/shelter.interface';

const makeShelter = (id: string, distance: number): ShelterWithDistance => ({
  id,
  externalId: `ext-${id}`,
  address: `Shelter ${id}`,
  lat: 32.064 + distance * 0.00001,
  lng: 34.772,
  lastUpdated: new Date(),
  distanceMeters: distance,
});

describe('ShelterSelectorService', () => {
  let service: ShelterSelectorService;

  const mockShelterService = {
    findNearby: jest.fn(),
    findNearestN: jest.fn(),
    getShelterCount: jest.fn(),
  };

  beforeEach(() => {
    service = new ShelterSelectorService(mockShelterService as any);
    jest.clearAllMocks();
  });

  describe('antiCrowdingSelect', () => {
    it('returns the only shelter when there is one', () => {
      const shelters = [makeShelter('A', 100)];
      expect(service.antiCrowdingSelect(shelters).id).toBe('A');
    });

    it('returns closest when no others are within threshold', () => {
      const shelters = [makeShelter('A', 100), makeShelter('B', 350)];
      expect(service.antiCrowdingSelect(shelters).id).toBe('A');
    });

    it('distributes across shelters within threshold over many runs', () => {
      const shelters = [
        makeShelter('A', 100),
        makeShelter('B', 120),
        makeShelter('C', 180),
      ];

      const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
      for (let i = 0; i < 1000; i++) {
        const result = service.antiCrowdingSelect(shelters);
        counts[result.id]++;
      }

      expect(counts['A']).toBeGreaterThan(200);
      expect(counts['B']).toBeGreaterThan(150);
      expect(counts['C']).toBeGreaterThan(50);
      expect(counts['A'] + counts['B'] + counts['C']).toBe(1000);
    });

    it('favors closer shelters with higher probability', () => {
      const shelters = [
        makeShelter('CLOSE', 50),
        makeShelter('FAR', 150),
      ];

      const counts: Record<string, number> = { CLOSE: 0, FAR: 0 };
      for (let i = 0; i < 1000; i++) {
        const result = service.antiCrowdingSelect(shelters);
        counts[result.id]++;
      }

      expect(counts['CLOSE']).toBeGreaterThan(counts['FAR']);
    });
  });

  describe('selectShelter', () => {
    it('returns null when no shelters nearby', async () => {
      mockShelterService.findNearby.mockResolvedValue([]);
      const result = await service.selectShelter(32.064, 34.772, 'Test', new Date().toISOString());
      expect(result).toBeNull();
    });

    it('returns EmergencyData with shelter info', async () => {
      mockShelterService.findNearby.mockResolvedValue([makeShelter('A', 100)]);
      const result = await service.selectShelter(32.064, 34.772, 'Missile Alert', '2026-01-01T00:00:00Z');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('MISSILE_ALERT');
      expect(result!.shelterAddress).toBe('Shelter A');
      expect(result!.distanceMeters).toBe(100);
      expect(result!.alertHeadline).toBe('Missile Alert');
      expect(['up', 'down', 'left', 'right']).toContain(result!.direction);
    });
  });
});
