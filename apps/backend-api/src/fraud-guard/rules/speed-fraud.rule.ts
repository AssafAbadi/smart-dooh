import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IFraudRule, FraudContext, FraudVerdict } from '../interfaces/fraud-rule.interface';
import { TOKENS } from '../../core/constants/tokens';
import type { IRedisService } from '../../core/interfaces/redis.interface';

const MAX_PLAUSIBLE_SPEED_KMH = parseInt(process.env['FRAUD_MAX_SPEED_KMH'] ?? '200', 10);
const MAX_TELEPORT_KMH = parseInt(process.env['FRAUD_MAX_TELEPORT_KMH'] ?? '300', 10);
const EARTH_RADIUS_KM = 6371;

@Injectable()
export class SpeedFraudRule implements IFraudRule {
  readonly name = 'SpeedFraudRule';
  readonly enabled = process.env['FRAUD_SPEED_RULE_ENABLED'] !== 'false';
  private readonly logger = new Logger(SpeedFraudRule.name);

  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  async evaluate(ctx: FraudContext): Promise<FraudVerdict> {
    if (ctx.speedKmh != null && ctx.speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
      return { isFraud: true, reason: `GPS speed ${ctx.speedKmh} km/h exceeds max ${MAX_PLAUSIBLE_SPEED_KMH}`, severity: 'block' };
    }

    const client = this.redis.getClient() as { get: (k: string) => Promise<string | null>; set: (...args: unknown[]) => Promise<unknown> } | null;
    if (!client) return { isFraud: false, severity: 'flag' };

    const key = `fraud:lastpos:${ctx.driverId}`;
    try {
      const prev = await client.get(key);
      await client.set(key, JSON.stringify({ lat: ctx.lat, lng: ctx.lng, t: ctx.timestamp }), 'EX', 300);
      if (!prev) return { isFraud: false, severity: 'flag' };

      const parsed = JSON.parse(prev) as { lat: number; lng: number; t: number };
      const dtHours = (ctx.timestamp - parsed.t) / 3_600_000;
      if (dtHours <= 0) return { isFraud: false, severity: 'flag' };

      const distKm = haversineKm(parsed.lat, parsed.lng, ctx.lat, ctx.lng);
      const impliedSpeed = distKm / dtHours;

      if (impliedSpeed > MAX_TELEPORT_KMH) {
        return { isFraud: true, reason: `Teleportation: ${Math.round(impliedSpeed)} km/h implied`, severity: 'block' };
      }
    } catch {
      this.logger.warn('SpeedFraudRule: Redis error, fail-open');
    }
    return { isFraud: false, severity: 'flag' };
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
