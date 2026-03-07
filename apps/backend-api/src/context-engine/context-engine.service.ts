import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { BusinessRecord } from '../core/interfaces/business-repository.interface';
import { MetricsService } from '../observability/metrics.service';
import type { IBusinessRepository } from '../core/interfaces/business-repository.interface';
import type {
  DriverPreferencesRecord,
  DriverPreferencesUpdate,
  IDriverPreferencesRepository,
} from '../core/interfaces/driver-preferences-repository.interface';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';
import { hasMovedMoreThanMeters } from '../external-api/utils/distance';
import type { PoiResult, WeatherResult } from '../external-api/interfaces/external-api.interface';
import { PlacesApiService } from '../external-api/places-api.service';
import { WeatherApiService } from '../external-api/weather-api.service';

const LAST_POSITION_KEY_PREFIX = 'context:last_position:';
const MOVE_THRESHOLD_METERS = 100;

export interface ContextWithIntegrationsResult {
  businesses: BusinessRecord[];
  pois: PoiResult[];
  weather: WeatherResult | null;
}

/**
 * Context Engine (BL): Cross-reference DriverPreferences with Business.
 * Returns businesses eligible for ads (kosher, alcohol, meat, language, category filters).
 * External integrations (Places, Weather) are called only if driver moved >100m or cache (TTL 10m) expired.
 */
@Injectable()
export class ContextEngineService {
  private readonly logger = new Logger(ContextEngineService.name);

  constructor(
    @Inject(TOKENS.IDriverPreferencesRepository)
    private readonly driverPrefsRepo: IDriverPreferencesRepository,
    @Inject(TOKENS.IBusinessRepository)
    private readonly businessRepo: IBusinessRepository,
    @Inject(TOKENS.IRedisService)
    private readonly redis: IRedisService,
    private readonly placesApi: PlacesApiService,
    private readonly weatherApi: WeatherApiService,
    private readonly metrics: MetricsService
  ) {}

  async getDriverPreferences(driverId: string): Promise<DriverPreferencesRecord | null> {
    const prefs = await this.driverPrefsRepo.getByDriverId(driverId);
    this.logger.log({ driverId, prefsFound: !!prefs, msg: 'getDriverPreferences' });
    return prefs;
  }

  async updateDriverPreferences(
    driverId: string,
    update: DriverPreferencesUpdate
  ): Promise<DriverPreferencesRecord> {
    this.logger.log({ driverId, body: update, msg: 'updateDriverPreferences' });
    const prefs = await this.driverPrefsRepo.upsert(driverId, update);
    return prefs;
  }

  async getFilteredBusinessesForDriver(driverId: string): Promise<BusinessRecord[]> {
    const prefs = await this.driverPrefsRepo.getByDriverId(driverId);
    const filter = {
      preference_tags: prefs?.preference_tags ?? [],
      excludedLanguages: prefs?.excludedLanguages ?? [],
    };
    const businesses = await this.businessRepo.findFiltered(filter);
    this.logger.log({ driverId, preference_tags: filter.preference_tags, businessesCount: businesses.length, msg: 'getFilteredBusinessesForDriver' });
    return businesses;
  }

  async getContextWithIntegrations(
    driverId: string,
    deviceId: string,
    lat: number,
    lng: number,
    geohash: string
  ): Promise<ContextWithIntegrationsResult> {
    this.logger.log({ driverId, deviceId, lat, lng, geohash, msg: 'getContextWithIntegrations' });
    const businesses = await this.getFilteredBusinessesForDriver(driverId);
    const client = this.redis.getClient() as Redis | null;
    const lastKey = `${LAST_POSITION_KEY_PREFIX}${deviceId}`;

    let last: { lat: number; lng: number } | null = null;
    if (client) {
      const raw = await client.get(lastKey);
      if (raw) {
        try {
          last = JSON.parse(raw) as { lat: number; lng: number };
        } catch {
          last = null;
        }
      }
    }

    const shouldFetch =
      !last || hasMovedMoreThanMeters(last.lat, last.lng, lat, lng, MOVE_THRESHOLD_METERS);
    const cachedPois = await this.placesApi.getCachedPois(geohash);
    const cachedWeather = await this.weatherApi.getCachedWeather(geohash);

    const needPois = shouldFetch || !cachedPois;
    const needWeather = shouldFetch || !cachedWeather;

    if (needPois) this.metrics.recordCacheMiss('poi');
    else this.metrics.recordCacheHit('poi');
    if (needWeather) this.metrics.recordCacheMiss('weather');
    else this.metrics.recordCacheHit('weather');

    const pois = needPois
      ? await this.placesApi.getNearbyPois(lat, lng, geohash)
      : cachedPois ?? [];
    const weather = needWeather
      ? await this.weatherApi.getWeather(lat, lng, geohash)
      : cachedWeather;

    if (client) {
      await client.set(lastKey, JSON.stringify({ lat, lng, geohash }));
    }

    return { businesses, pois, weather };
  }
}
