import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Inject } from '@nestjs/common';
import type { IRateLimitService } from '../../core/interfaces/rate-limit.interface';
import { TOKENS } from '../../core/constants/tokens';

/**
 * Guard: device limit 2 req / 6s (so initial fetch + polling don't 429). Returns 429 with Retry-After and body { retryAfter }.
 * Skips limit for /driver-preferences/ (load/save filters) so one tap always works.
 */
@Injectable()
export class DeviceRateLimitGuard implements CanActivate {
  constructor(
    @Inject(TOKENS.IRateLimitService)
    private readonly rateLimit: IRateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const url = request.url?.split('?')[0] ?? '';
    if (url.includes('driver-preferences')) return true;
    if (url.includes('/ad-selection/last/')) return true;
    const deviceId =
      (request.headers['x-device-id'] as string) ||
      (request.ip as string) ||
      'anonymous';

    const result = await this.rateLimit.checkDevice(deviceId);
    if (result.allowed) return true;

    reply.status(HttpStatus.TOO_MANY_REQUESTS);
    reply.header('Retry-After', String(result.retryAfterSeconds));
    reply.send({ retryAfter: result.retryAfterSeconds });
    return false;
  }
}
