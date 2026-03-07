import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type {
  IRateLimitService,
  RateLimitResult,
} from '../core/interfaces/rate-limit.interface';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';

const DEVICE_WINDOW_SEC = 6;
const DEVICE_MAX_REQUESTS = 2;
const API_WINDOW_SEC = 60;
const API_MAX_REQUESTS = 10;

@Injectable()
export class RateLimitService implements IRateLimitService {
  constructor(
    @Inject(TOKENS.IRedisService)
    private readonly redis: IRedisService
  ) {}

  private getClient(): Redis | null {
    return this.redis.getClient() as Redis | null;
  }

  async checkDevice(deviceId: string): Promise<RateLimitResult> {
    const client = this.getClient();
    if (!client) return { allowed: true };

    const key = `ratelimit:device:${deviceId}`;
    const results = await client.multi().incr(key).ttl(key).exec();
    if (!results) return { allowed: true };
    const count = (results[0]?.[1] as number) ?? 0;
    const ttl = (results[1]?.[1] as number) ?? 0;

    if (count === 1) await client.expire(key, DEVICE_WINDOW_SEC);
    if (count <= DEVICE_MAX_REQUESTS) return { allowed: true };
    const retryAfter = ttl > 0 ? ttl : DEVICE_WINDOW_SEC;
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  async checkExternalApi(geohash: string, service: string): Promise<RateLimitResult> {
    const client = this.getClient();
    if (!client) return { allowed: true };

    const key = `api_calls:${geohash}:${service}`;
    const results = await client.multi().incr(key).ttl(key).exec();
    if (!results) return { allowed: true };
    const count = (results[0]?.[1] as number) ?? 0;
    const ttl = (results[1]?.[1] as number) ?? 0;

    if (count === 1) await client.expire(key, API_WINDOW_SEC);

    if (count <= API_MAX_REQUESTS) {
      return { allowed: true };
    }
    const retryAfter = ttl > 0 ? ttl : API_WINDOW_SEC;
    return { allowed: false, retryAfterSeconds: retryAfter };
  }
}
