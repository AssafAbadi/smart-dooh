import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ALERT_NEW_EVENT, ALERT_CLEAR_EVENT } from './pikud-haoref.service';
import { EmergencyGateway } from './emergency.gateway';
import { ShelterSelectorService } from './shelter-selector.service';
import { AlertStateRepository } from './repositories/alert-state.repository';
import { AlertZoneMatcher } from './alert-zone-matcher.service';
import { ConfigService } from '../config/config.service';
import { TOKENS } from '../core/constants/tokens';
import type { IRedisService } from '../core/interfaces/redis.interface';
import type { ActiveAlert } from './interfaces/pikud-haoref.interface';
import type { EmergencyCheckResult, EmergencyData } from './interfaces/emergency.interface';
import { MetricsService } from '../observability/metrics.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { DriverRepository } from '../driver/repositories/driver.repository';
import { DriverLocationService } from '../driver/driver-location.service';

const DISPLAY_LAST_KEY_PREFIX = 'display:last:';
/** Match ad-selection.controller TTL so display and app stay in sync. */
const DISPLAY_LAST_TTL_SEC = 600;

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);
  private currentAlertData: ActiveAlert | null = null;
  private lastProcessedAlertId: string | null = null;
  private readonly showAllIsraelAlerts: boolean;

  constructor(
    @Inject(forwardRef(() => EmergencyGateway))
    private readonly gateway: EmergencyGateway,
    private readonly shelterSelector: ShelterSelectorService,
    private readonly alertStateRepo: AlertStateRepository,
    private readonly zoneMatcher: AlertZoneMatcher,
    private readonly config: ConfigService,
    @Inject(TOKENS.IRedisService) @Optional() private readonly redis?: IRedisService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly pushNotifications?: PushNotificationsService,
    @Optional() private readonly driverRepository?: DriverRepository,
    @Optional() private readonly driverLocationService?: DriverLocationService,
  ) {
    const v = this.config.get('EMERGENCY_SHOW_ALL_ISRAEL_ALERTS');
    this.showAllIsraelAlerts = v === 'true' || v === '1';
    if (this.showAllIsraelAlerts) {
      this.logger.warn('EMERGENCY_SHOW_ALL_ISRAEL_ALERTS=true: any Pikud HaOref alert in Israel will show on the app (testing only).');
    }
  }

  @OnEvent(ALERT_NEW_EVENT)
  async handleNewAlert(alert: ActiveAlert): Promise<void> {
    // Idempotency: skip if same alert was already processed
    if (alert.id === this.lastProcessedAlertId) {
      this.logger.debug({ msg: 'Duplicate alert ignored', alertId: alert.id });
      return;
    }
    this.lastProcessedAlertId = alert.id;

    const alertStart = Date.now();
    this.logger.warn({ msg: 'Processing new alert', areas: alert.areas, title: alert.title });
    this.currentAlertData = alert;
    this.metrics?.recordEmergencyAlertDetected();
    this.metrics?.setSocketConnectionsActive(this.gateway.getConnectionCount());

    if (!this.showAllIsraelAlerts && !this.zoneMatcher.alertMatchesRegion(alert.areas)) {
      this.logger.log({ msg: 'Alert does not match configured region – ignoring', areas: alert.areas });
      return;
    }

    await this.alertStateRepo.store({
      title: alert.title,
      areas: alert.areas,
      detectedAt: alert.detectedAt.toISOString(),
    });

    const drivers = this.gateway.getConnectedDrivers();
    const matchedDrivers = this.showAllIsraelAlerts
      ? drivers
      : drivers.filter((d) => this.zoneMatcher.isDriverInAlertZone(d.lat, d.lng));
    this.logger.log({
      msg: this.showAllIsraelAlerts ? 'Notifying all connected drivers (show-all-Israel mode)' : 'Notifying drivers in alert zone',
      totalConnected: drivers.length,
      matched: matchedDrivers.length,
    });

    const results = await Promise.allSettled(
      matchedDrivers.map(async (driver) => {
        const selStart = Date.now();
        const emergencyData = await this.shelterSelector.selectShelter(
          driver.lat,
          driver.lng,
          alert.title,
          alert.detectedAt.toISOString(),
        );
        this.metrics?.recordShelterSelectionDuration((Date.now() - selStart) / 1000);

        if (emergencyData) {
          this.gateway.emitToDriver(driver.driverId, 'ALERT_ACTIVE', emergencyData);
          await this.cacheEmergencyForDisplay(driver.driverId, emergencyData);
          this.metrics?.recordEmergencyPushLatency((Date.now() - alertStart) / 1000);
          this.logger.warn({
            msg: 'Sent ALERT_ACTIVE to driver',
            driverId: driver.driverId,
            shelter: emergencyData.shelterAddress,
            latencyMs: Date.now() - alertStart,
          });
          return { driverId: driver.driverId, emergencyData } as const;
        }
        return null;
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error({ msg: 'Some driver notifications failed', failureCount: failures.length });
    }

    const driverEmergencyPairs = results
      .filter((r): r is PromiseFulfilledResult<{ driverId: string; emergencyData: EmergencyData } | null> => r.status === 'fulfilled' && r.value != null)
      .map((r) => r.value as { driverId: string; emergencyData: EmergencyData });

    // Fire-and-forget: send push to connected drivers and to offline drivers (with push token + last-known location in zone).
    if (this.pushNotifications && this.driverRepository) {
      this.addOfflineDriversAndSendPush(alert, driverEmergencyPairs).catch((err) =>
        this.logger.error({ msg: 'Push batch failed', error: err instanceof Error ? err.message : String(err) }),
      );
    }

    // When no drivers are connected (e.g. test alert before app opens), still cache emergency for
    // display so the display URL shows the alert. Use default Tel Aviv coords to get a shelter.
    if (matchedDrivers.length === 0 && this.showAllIsraelAlerts) {
      const defaultLat = 32.08;
      const defaultLng = 34.78;
      const emergencyData = await this.shelterSelector.selectShelter(
        defaultLat,
        defaultLng,
        alert.title,
        alert.detectedAt.toISOString(),
      );
      if (emergencyData) {
        await this.cacheEmergencyForDisplay('driver-1', emergencyData);
        await this.cacheEmergencyForDisplay('sim-driver-1', emergencyData);
        this.logger.log({ msg: 'Cached emergency for display (no drivers connected)' });
      }
    }
  }

  @OnEvent(ALERT_CLEAR_EVENT)
  async handleAlertClear(): Promise<void> {
    this.logger.log('Alert cleared');
    this.currentAlertData = null;
    this.lastProcessedAlertId = null;
    await this.alertStateRepo.clear();
    this.gateway.broadcastClear();
    await this.clearDisplayLastCache();
  }

  /**
   * Cache emergency as the "last" instruction for the display URL so
   * GET /ad-selection/last/:driverId returns the alert and the display page shows it.
   */
  private async cacheEmergencyForDisplay(driverId: string, data: EmergencyData): Promise<void> {
    const client = this.redis?.getClient() as { setex(key: string, ttl: number, value: string): Promise<unknown> } | null;
    if (!client) return;
    const instruction = {
      campaignId: 'emergency',
      creativeId: `pikud-${Date.now()}`,
      headline: data.alertHeadline,
      body: `מקלט: ${data.shelterAddress} (${data.distanceMeters}m)`,
      direction: data.direction,
      distanceMeters: data.distanceMeters,
      couponCode: '',
      businessId: 'emergency',
    };
    const key = `${DISPLAY_LAST_KEY_PREFIX}${driverId}`;
    try {
      await client.setex(key, DISPLAY_LAST_TTL_SEC, JSON.stringify({ instructions: [instruction] }));
      this.logger.log({ driverId, msg: 'Cached emergency for display' });
    } catch (e) {
      this.logger.warn({ driverId, msg: 'Failed to cache emergency for display', error: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Default Tel Aviv coords when we have no driver location (e.g. show-all-Israel or expired Redis). */
  private static readonly DEFAULT_ALERT_LAT = 32.08;
  private static readonly DEFAULT_ALERT_LNG = 34.78;

  /**
   * Add drivers who are not connected but have a push token (using last-known location or default coords in show-all mode).
   * Then send push to all (connected + offline). Ensures alerts reach app-closed/backgrounded drivers.
   */
  private async addOfflineDriversAndSendPush(
    alert: ActiveAlert,
    connectedPairs: Array<{ driverId: string; emergencyData: EmergencyData }>,
  ): Promise<void> {
    if (!this.pushNotifications || !this.driverRepository) return;

    const connectedSet = new Set(connectedPairs.map((p) => p.driverId));
    let driverIdsWithTokens: string[];
    try {
      driverIdsWithTokens = await this.driverRepository.getDriverIdsWithPushTokens();
    } catch (e) {
      this.logger.warn({ msg: 'Failed to get driver IDs with push tokens', error: e instanceof Error ? e.message : String(e) });
      driverIdsWithTokens = [];
    }
    if (driverIdsWithTokens.length === 0 && connectedPairs.length === 0) {
      this.logger.log({ msg: 'No drivers with push tokens; open the driver app, allow notifications, and enter the main screen to register for push alerts' });
      return;
    }
    if (driverIdsWithTokens.length === 0) {
      await this.sendPushNotificationsForAlert(connectedPairs);
      return;
    }

    const offlineDriverIds = driverIdsWithTokens.filter((id) => !connectedSet.has(id));
    if (offlineDriverIds.length === 0) {
      await this.sendPushNotificationsForAlert(connectedPairs);
      return;
    }

    const offlinePairs: Array<{ driverId: string; emergencyData: EmergencyData }> = [];
    for (const driverId of offlineDriverIds) {
      try {
        let lat: number;
        let lng: number;
        let usedDefault = false;
        if (this.driverLocationService) {
          const loc = await this.driverLocationService.getLastLocation(driverId);
          if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
            if (!this.showAllIsraelAlerts && !this.zoneMatcher.isDriverInAlertZone(loc.lat, loc.lng)) continue;
            lat = loc.lat;
            lng = loc.lng;
          } else {
            if (!this.showAllIsraelAlerts) continue;
            lat = EmergencyService.DEFAULT_ALERT_LAT;
            lng = EmergencyService.DEFAULT_ALERT_LNG;
            usedDefault = true;
          }
        } else {
          if (!this.showAllIsraelAlerts) continue;
          lat = EmergencyService.DEFAULT_ALERT_LAT;
          lng = EmergencyService.DEFAULT_ALERT_LNG;
          usedDefault = true;
        }
        const emergencyData = await this.shelterSelector.selectShelter(
          lat,
          lng,
          alert.title,
          alert.detectedAt.toISOString(),
        );
        if (emergencyData) {
          offlinePairs.push({ driverId, emergencyData });
          if (usedDefault) {
            this.logger.log({ msg: 'Offline driver push with default coords (no recent location)', driverId });
          }
        }
      } catch (e) {
        this.logger.debug({ msg: 'Skip offline driver', driverId, error: e instanceof Error ? e.message : String(e) });
      }
    }
    if (offlinePairs.length > 0) {
      this.logger.log({ msg: 'Sending push to offline drivers', count: offlinePairs.length, driverIds: offlinePairs.map((p) => p.driverId) });
    }

    const allPairs = [...connectedPairs, ...offlinePairs];
    if (allPairs.length > 0) {
      await this.sendPushNotificationsForAlert(allPairs);
    } else {
      this.logger.warn({ msg: 'No push recipients (connected or offline) for alert' });
    }
  }

  /**
   * Send push notifications to drivers with registered Expo push tokens.
   * Payload includes full shelter data so the app can restore state on tap without an API call.
   */
  private async sendPushNotificationsForAlert(
    driverEmergencyPairs: Array<{ driverId: string; emergencyData: EmergencyData }>,
  ): Promise<void> {
    if (!this.pushNotifications || !this.driverRepository) return;
    const driverIds = driverEmergencyPairs.map((p) => p.driverId);
    const tokenMap = await this.driverRepository.getDriversPushTokens(driverIds);
    const items = driverEmergencyPairs
      .map(({ driverId, emergencyData }) => {
        const token = tokenMap.get(driverId);
        if (!token) return null;
        return {
          token,
          payload: {
            title: '🚨 אזעקת טילים - כנס למרחב מוגן!',
            body: emergencyData.alertHeadline,
            data: {
              type: 'EMERGENCY_ALERT' as const,
              shelterLat: emergencyData.shelterLat,
              shelterLng: emergencyData.shelterLng,
              shelterAddress: emergencyData.shelterAddress,
              headline: emergencyData.alertHeadline,
              distanceMeters: emergencyData.distanceMeters,
              bearingDegrees: emergencyData.bearingDegrees,
              direction: emergencyData.direction,
            },
            priority: 'high' as const,
            sound: 'default' as const,
            channelId: 'emergency-alerts',
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (items.length === 0) return;
    await this.pushNotifications.sendBatch(items);
  }

  /** Clear display:last cache so the app stops showing the emergency as "From display (synced)". */
  private async clearDisplayLastCache(): Promise<void> {
    const client = this.redis?.getClient() as { del(...keys: string[]): Promise<number> } | null;
    if (!client?.del) return;
    const keys = [`${DISPLAY_LAST_KEY_PREFIX}driver-1`, `${DISPLAY_LAST_KEY_PREFIX}sim-driver-1`];
    try {
      await client.del(...keys);
      this.logger.log({ msg: 'Cleared display last cache after alert clear', keys });
    } catch (e) {
      this.logger.warn({ msg: 'Failed to clear display last cache', error: e instanceof Error ? e.message : String(e) });
    }
  }

  async checkForLocation(lat: number, lng: number): Promise<EmergencyCheckResult> {
    const alertState = await this.alertStateRepo.get();
    if (!alertState) return { active: false };

    if (!this.showAllIsraelAlerts && !this.zoneMatcher.isDriverInAlertZone(lat, lng)) return { active: false };

    const emergencyData = await this.shelterSelector.selectShelter(
      lat,
      lng,
      alertState.title,
      alertState.detectedAt,
    );

    if (!emergencyData) return { active: false };

    return {
      active: true,
      shelter: {
        address: emergencyData.shelterAddress,
        lat: emergencyData.shelterLat,
        lng: emergencyData.shelterLng,
        distanceMeters: emergencyData.distanceMeters,
        bearingDegrees: emergencyData.bearingDegrees,
        direction: emergencyData.direction,
      },
      alert: {
        headline: emergencyData.alertHeadline,
        timestamp: emergencyData.alertTimestamp,
      },
    };
  }

  async getEmergencyDataForLocation(lat: number, lng: number): Promise<EmergencyData | null> {
    const alertState = await this.alertStateRepo.get();
    if (!alertState) return null;

    if (!this.showAllIsraelAlerts && !this.zoneMatcher.isDriverInAlertZone(lat, lng)) return null;

    return this.shelterSelector.selectShelter(
      lat,
      lng,
      alertState.title,
      alertState.detectedAt,
    );
  }

  isAlertActive(): boolean {
    return this.currentAlertData !== null;
  }

  getConnectionCount(): number {
    return this.gateway.getConnectionCount();
  }

  /** For status page: current alert headline when active, else undefined. */
  getCurrentAlertHeadline(): string | undefined {
    return this.currentAlertData?.title;
  }

  async triggerTestAlert(areas: string[], headline: string): Promise<void> {
    const alert: ActiveAlert = {
      id: `test-${Date.now()}`,
      cat: 1,
      title: headline,
      areas,
      desc: 'Test alert triggered via admin endpoint',
      detectedAt: new Date(),
    };
    await this.handleNewAlert(alert);
  }

  async clearAlert(): Promise<void> {
    await this.handleAlertClear();
  }
}
