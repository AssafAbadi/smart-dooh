import { EmergencyService } from '../emergency.service';
import type { ActiveAlert } from '../interfaces/pikud-haoref.interface';
import type { AlertState } from '../repositories/alert-state.repository';

describe('EmergencyService', () => {
  let service: EmergencyService;

  const mockGateway = {
    getConnectedDrivers: jest.fn().mockReturnValue([]),
    emitToDriver: jest.fn(),
    broadcastClear: jest.fn(),
    getConnectionCount: jest.fn().mockReturnValue(0),
  };

  const mockShelterSelector = {
    selectShelter: jest.fn(),
  };

  let storedAlertState: AlertState | null = null;
  const mockAlertStateRepo = {
    store: jest.fn().mockImplementation((state: AlertState) => {
      storedAlertState = state;
      return Promise.resolve();
    }),
    get: jest.fn().mockImplementation(() => Promise.resolve(storedAlertState)),
    clear: jest.fn().mockImplementation(() => {
      storedAlertState = null;
      return Promise.resolve();
    }),
  };

  const mockZoneMatcher = {
    alertMatchesRegion: jest.fn().mockReturnValue(true),
    isDriverInAlertZone: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    storedAlertState = null;
    service = new EmergencyService(
      mockGateway as any,
      mockShelterSelector as any,
      mockAlertStateRepo as any,
      mockZoneMatcher as any,
    );
    jest.clearAllMocks();
    // Re-apply mock implementations after clearAllMocks
    mockAlertStateRepo.store.mockImplementation((state: AlertState) => {
      storedAlertState = state;
      return Promise.resolve();
    });
    mockAlertStateRepo.get.mockImplementation(() => Promise.resolve(storedAlertState));
    mockAlertStateRepo.clear.mockImplementation(() => {
      storedAlertState = null;
      return Promise.resolve();
    });
    mockZoneMatcher.alertMatchesRegion.mockReturnValue(true);
    mockZoneMatcher.isDriverInAlertZone.mockReturnValue(true);
    mockGateway.getConnectedDrivers.mockReturnValue([]);
  });

  describe('handleNewAlert', () => {
    it('ignores alerts not matching the configured region', async () => {
      mockZoneMatcher.alertMatchesRegion.mockReturnValue(false);
      const alert: ActiveAlert = {
        id: 'test-1',
        cat: 1,
        title: 'Test',
        areas: ['חיפה'],
        desc: '',
        detectedAt: new Date(),
      };
      await service.handleNewAlert(alert);
      expect(mockGateway.emitToDriver).not.toHaveBeenCalled();
      expect(mockAlertStateRepo.store).not.toHaveBeenCalled();
    });

    it('ignores duplicate alerts (idempotency)', async () => {
      const alert: ActiveAlert = {
        id: 'dedup-test',
        cat: 1,
        title: 'Test',
        areas: ['תל אביב'],
        desc: '',
        detectedAt: new Date(),
      };
      await service.handleNewAlert(alert);
      await service.handleNewAlert(alert);
      expect(mockAlertStateRepo.store).toHaveBeenCalledTimes(1);
    });

    it('processes matching alerts, notifies in-zone drivers, does not broadcast empty data', async () => {
      const alert: ActiveAlert = {
        id: 'test-2',
        cat: 1,
        title: 'אזעקת טילים',
        areas: ['תל אביב - מרכז העיר'],
        desc: '',
        detectedAt: new Date(),
      };

      mockGateway.getConnectedDrivers.mockReturnValue([
        { driverId: 'driver-1', lat: 32.064, lng: 34.772, socketId: 's1' },
      ]);
      mockShelterSelector.selectShelter.mockResolvedValue({
        type: 'MISSILE_ALERT',
        shelterAddress: 'Test Shelter',
        shelterLat: 32.065,
        shelterLng: 34.773,
        distanceMeters: 100,
        bearingDegrees: 45,
        direction: 'right',
        alertHeadline: 'אזעקת טילים',
        alertTimestamp: new Date().toISOString(),
      });

      await service.handleNewAlert(alert);

      expect(mockAlertStateRepo.store).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'אזעקת טילים', areas: ['תל אביב - מרכז העיר'] }),
      );
      expect(mockShelterSelector.selectShelter).toHaveBeenCalledWith(
        32.064,
        34.772,
        'אזעקת טילים',
        expect.any(String),
      );
      expect(mockGateway.emitToDriver).toHaveBeenCalledWith(
        'driver-1',
        'ALERT_ACTIVE',
        expect.objectContaining({ type: 'MISSILE_ALERT' }),
      );
      // No blanket broadcast to all drivers
      expect(mockGateway).not.toHaveProperty('broadcastAlert');
    });

    it('skips drivers outside the alert zone', async () => {
      const alert: ActiveAlert = {
        id: 'test-zone',
        cat: 1,
        title: 'Test',
        areas: ['תל אביב'],
        desc: '',
        detectedAt: new Date(),
      };
      mockGateway.getConnectedDrivers.mockReturnValue([
        { driverId: 'driver-outside', lat: 31.5, lng: 35.0, socketId: 's1' },
      ]);
      mockZoneMatcher.isDriverInAlertZone.mockReturnValue(false);

      await service.handleNewAlert(alert);
      expect(mockGateway.emitToDriver).not.toHaveBeenCalled();
    });
  });

  describe('checkForLocation', () => {
    it('returns inactive when no alert state', async () => {
      const result = await service.checkForLocation(32.064, 34.772);
      expect(result.active).toBe(false);
    });

    it('returns inactive for locations outside alert zone', async () => {
      mockZoneMatcher.isDriverInAlertZone.mockReturnValue(false);
      storedAlertState = { title: 'Test', areas: ['תל אביב'], detectedAt: new Date().toISOString() };
      const result = await service.checkForLocation(31.5, 35.0);
      expect(result.active).toBe(false);
    });
  });

  describe('handleAlertClear', () => {
    it('clears state and broadcasts clear to all', async () => {
      await service.handleAlertClear();
      expect(mockAlertStateRepo.clear).toHaveBeenCalled();
      expect(mockGateway.broadcastClear).toHaveBeenCalled();
      expect(service.isAlertActive()).toBe(false);
    });
  });
});
