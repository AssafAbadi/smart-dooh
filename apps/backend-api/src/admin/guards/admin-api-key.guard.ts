import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ExternalApiConfigService } from '../../config/external-api-keys.config';

/**
 * Optional guard: if ADMIN_API_KEY is set, require x-admin-api-key header to match.
 * If ADMIN_API_KEY is not set, admin routes are open (dev only).
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ExternalApiConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.apiKeys.getAdminApiKey();
    if (!key) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers['x-admin-api-key'];
    if (header !== key) {
      throw new UnauthorizedException('Invalid or missing x-admin-api-key');
    }
    return true;
  }
}
