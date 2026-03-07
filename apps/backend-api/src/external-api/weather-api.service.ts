import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { z } from 'zod';
import { ExternalApiConfigService } from '../config/external-api-keys.config';
import type { IRateLimitService } from '../core/interfaces/rate-limit.interface';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';
import type { WeatherResult } from './interfaces/external-api.interface';

const CACHE_TTL_SEC = 600; // 10 min
const CACHE_KEY_PREFIX = 'context:weather:';

const openWeatherMapResponseSchema = z.object({
  main: z.object({ temp: z.number().optional() }).optional(),
  weather: z.array(z.object({
    main: z.string().optional(),
    description: z.string().optional(),
    id: z.number().optional(),
  })).optional(),
});

type OpenWeatherMapResponse = z.infer<typeof openWeatherMapResponseSchema>;

@Injectable()
export class WeatherApiService {
  private readonly logger = new Logger(WeatherApiService.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
    @Inject(TOKENS.IRateLimitService) private readonly rateLimit: IRateLimitService,
    private readonly apiKeys: ExternalApiConfigService,
  ) {}

  private getClient(): Redis | null {
    return this.redis.getClient() as Redis | null;
  }

  /** Read weather from cache only (no API call). Used to decide if we need to call API (e.g. when driver moved >100m or cache expired). */
  async getCachedWeather(geohash: string): Promise<WeatherResult | null> {
    const client = this.getClient();
    if (!client) return null;
    const cacheKey = `${CACHE_KEY_PREFIX}${geohash}`;
    const cached = await client.get(cacheKey);
    return cached ? (JSON.parse(cached) as WeatherResult) : null;
  }

  async getWeather(lat: number, lng: number, geohash: string): Promise<WeatherResult | null> {
    const client = this.getClient();
    const cacheKey = `${CACHE_KEY_PREFIX}${geohash}`;

    const limitResult = await this.rateLimit.checkExternalApi(geohash, 'weather');
    if (!limitResult.allowed) {
      const cached = client ? await client.get(cacheKey) : null;
      if (cached) return JSON.parse(cached) as WeatherResult;
      return null;
    }

    if (client) {
      const cached = await client.get(cacheKey);
      if (cached) return JSON.parse(cached) as WeatherResult;
    }

    const apiKey = this.apiKeys.getWeatherApiKey();
    if (!apiKey) return null;

    try {
      this.logger.log({
        msg: '[WeatherAPI] request',
        lat,
        lng,
        geohash,
      });
      const url = new URL('https://api.openweathermap.org/data/2.5/weather');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('appid', apiKey);
      url.searchParams.set('units', 'metric');
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const raw = (await res.json()) as unknown;
      const parsed = openWeatherMapResponseSchema.safeParse(raw);
      if (!parsed.success) return null;
      const data: OpenWeatherMapResponse = parsed.data;
      const temp = data.main?.temp ?? 0;
      const condition = data.weather?.[0]?.main ?? 'Unknown';
      const code = data.weather?.[0]?.id;
      const result: WeatherResult = { tempCelsius: temp, condition, code };
      this.logger.log({
        msg: '[WeatherAPI] response',
        tempCelsius: result.tempCelsius,
        condition: result.condition,
      });
      if (client) await client.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(result));
      return result;
    } catch {
      return null;
    }
  }
}
