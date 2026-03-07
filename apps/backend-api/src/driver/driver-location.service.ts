import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';
import type { DriverLocationBodyDto } from '@smart-dooh/shared-dto';
import { GeocodingService, type ReverseGeocodeResult } from '../external-api/geocoding.service';

const DRIVER_LOCATION_KEY_PREFIX = 'driver:location:';
const DRIVER_LOCATION_TTL_SEC = 300; // 5 min

export interface StoredDriverLocation {
  lat: number;
  lng: number;
  geohash?: string;
  area?: string;
  neighborhood?: string;
  locality?: string;
  updatedAt: number;
}

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
    private readonly geocoding: GeocodingService,
  ) {}

  async upsertLocation(body: DriverLocationBodyDto): Promise<{ ok: boolean; area?: string; neighborhood?: string }> {
    const client = this.redis.getClient() as { setex(key: string, ttl: number, value: string): Promise<unknown> } | null;
    const key = `${DRIVER_LOCATION_KEY_PREFIX}${body.driverId}`;

    let geo: ReverseGeocodeResult | null = null;
    try {
      geo = await this.geocoding.reverseGeocode(body.lat, body.lng);
    } catch {
      // non-fatal
    }

    const payload: StoredDriverLocation = {
      lat: body.lat,
      lng: body.lng,
      geohash: body.geohash,
      area: geo?.area,
      neighborhood: geo?.neighborhood,
      locality: geo?.locality,
      updatedAt: Date.now(),
    };

    if (client) {
      await client.setex(key, DRIVER_LOCATION_TTL_SEC, JSON.stringify(payload));
    }

    this.logger.log({
      driverId: body.driverId,
      lat: body.lat,
      lng: body.lng,
      area: payload.area,
      neighborhood: payload.neighborhood,
      msg: 'POST /driver/location',
    });

    return {
      ok: true,
      area: payload.area,
      neighborhood: payload.neighborhood,
    };
  }

  async getLastLocation(driverId: string): Promise<StoredDriverLocation | null> {
    const client = this.redis.getClient() as { get(key: string): Promise<string | null> } | null;
    if (!client) return null;
    const key = `${DRIVER_LOCATION_KEY_PREFIX}${driverId}`;
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredDriverLocation;
    } catch {
      return null;
    }
  }
}
