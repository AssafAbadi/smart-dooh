import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';
import type { IRedisService } from '../core/interfaces/redis.interface';

@Injectable()
export class RedisService implements IRedisService, OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<boolean> {
    const c = this.getClient();
    if (!c) return false;
    try {
      const result = await c.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  getClient(): Redis | null {
    const redisUrl = this.config.get('REDIS_URL');
    if (!this.client && redisUrl) {
      this.client = new Redis(redisUrl);
    }
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
