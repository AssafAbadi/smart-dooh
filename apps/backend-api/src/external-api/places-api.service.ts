import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ExternalApiConfigService } from '../config/external-api-keys.config';
import type { IRateLimitService } from '../core/interfaces/rate-limit.interface';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';
import type { PoiResult } from './interfaces/external-api.interface';
import { mapGooglePlaceTypesToCategory } from './constants/category-mapping';

const CACHE_TTL_SEC = 600; // 10 min
const CACHE_KEY_PREFIX = 'context:places:';

@Injectable()
export class PlacesApiService {
  private readonly logger = new Logger(PlacesApiService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
    @Inject(TOKENS.IRateLimitService) private readonly rateLimit: IRateLimitService,
    private readonly apiKeys: ExternalApiConfigService,
  ) {}

  private getClient(): Redis | null {
    return this.redis.getClient() as Redis | null;
  }

  /** Read POIs from cache only (no API call). Used to decide if we need to call API (e.g. when driver moved >100m or cache expired). */
  async getCachedPois(geohash: string): Promise<PoiResult[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const cacheKey = `${CACHE_KEY_PREFIX}${geohash}`;
    const cached = await client.get(cacheKey);
    return cached ? (JSON.parse(cached) as PoiResult[]) : null;
  }

  async getNearbyPois(lat: number, lng: number, geohash: string): Promise<PoiResult[]> {
    const client = this.getClient();
    const cacheKey = `${CACHE_KEY_PREFIX}${geohash}`;

    const limitResult = await this.rateLimit.checkExternalApi(geohash, 'places');
    if (!limitResult.allowed) {
      const cached = client ? await client.get(cacheKey) : null;
      if (cached) return JSON.parse(cached) as PoiResult[];
      return [];
    }

    if (client) {
      const cached = await client.get(cacheKey);
      if (cached) return JSON.parse(cached) as PoiResult[];
    }

    const apiKey = this.apiKeys.getGooglePlacesApiKey();
    if (!apiKey) return [];

    try {
      this.logger.log({ msg: '[PlacesAPI] request', lat, lng, geohash });
      const url = new URL('https://places.googleapis.com/v1/places:searchNearby');
      const body = {
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 500,
          },
        },
      };
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return [];

      const data = (await res.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          types?: string[];
          location?: { latitude?: number; longitude?: number };
          formattedAddress?: string;
        }>;
      };
      const places = data.places ?? [];
      const results: PoiResult[] = places.map((p) => {
        const types = p.types ?? [];
        return {
          placeId: p.id ?? '',
          name: p.displayName?.text ?? 'Unknown',
          types,
          category: mapGooglePlaceTypesToCategory(types),
          lat: p.location?.latitude ?? lat,
          lng: p.location?.longitude ?? lng,
          vicinity: p.formattedAddress,
        };
      });

      this.logger.log({ msg: '[PlacesAPI] response', placeCount: results.length });
      if (client) await client.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(results));
      return results;
    } catch {
      return [];
    }
  }
}
