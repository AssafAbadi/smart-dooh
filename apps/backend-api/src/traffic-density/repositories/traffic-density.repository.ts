import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { toGeohash7 } from '../../core/utils/geohash.util';
import type { IRedisService } from '../../core/interfaces/redis.interface';
import { TOKENS } from '../../core/constants/tokens';

const CACHE_KEY_PREFIX = 'traffic_density:';
const CACHE_TTL_SECONDS = 600; // 10 minutes

export interface TrafficDensityRecord {
  baseDensity: number;
}

@Injectable()
export class TrafficDensityRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService
  ) {}

  /**
   * Find base density for a geohash (level 7) and time slot. Returns null if no row.
   * Uses cache-aside: Redis cache with fallback to DB when cache miss or Redis unavailable.
   */
  async findByGeohashAndTime(
    geohash: string,
    dayOfWeek: number,
    hour: number
  ): Promise<TrafficDensityRecord | null> {
    const geohash7 = toGeohash7(geohash);
    const key = `${CACHE_KEY_PREFIX}${geohash7}:${dayOfWeek}:${hour}`;
    const client = this.redis.getClient() as Redis | null;

    if (client) {
      try {
        const cached = await client.get(key);
        if (cached !== null && cached !== undefined) {
          const parsed = JSON.parse(cached) as TrafficDensityRecord;
          return parsed;
        }
      } catch {
        // Cache read failed; fall back to DB
      }
    }

    const row = await this.prisma.trafficDensity.findUnique({
      where: {
        geohash_dayOfWeek_hour: { geohash: geohash7, dayOfWeek, hour },
      },
      select: { baseDensity: true },
    });

    if (client && row !== null) {
      try {
        await client.setex(key, CACHE_TTL_SECONDS, JSON.stringify({ baseDensity: row.baseDensity }));
      } catch {
        // Cache write failed; result still correct
      }
    }

    if (row === null) return null;
    return { baseDensity: row.baseDensity };
  }
}

