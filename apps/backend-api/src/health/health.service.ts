import { Inject, Injectable } from '@nestjs/common';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';

/**
 * Business logic: liveness and readiness. Delegates readiness to infra (Redis, DB via IHealthChecker later).
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(TOKENS.IRedisService)
    private readonly redis: IRedisService
  ) {}

  live(): { status: string } {
    return { status: 'ok' };
  }

  async ready(): Promise<{ ready: boolean; checks?: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {
      redis: await this.redis.ping(),
    };
    const ready = Object.values(checks).every(Boolean);
    return { ready, checks };
  }
}
