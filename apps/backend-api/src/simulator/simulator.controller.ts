import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  simulatorPositionBodySchema,
  simulatorPositionQuerySchema,
  type SimulatorPositionBodyDto,
  type SimulatorPositionQueryDto,
} from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { RedisService } from '../redis/redis.service';

const KEY_PREFIX = 'simulated_position:';
const TTL_SEC = 60; // Expire if simulator stops updating

@ApiTags('Simulator')
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly redis: RedisService) {}

  /**
   * Store current simulated position for a driver (called by mock-driver-simulator).
   * Phone app in "simulator mode" polls GET with same driverId to use this position for ads.
   */
  @Post('position')
  @ApiOperation({ summary: 'Set simulated position for driver' })
  @UsePipes(new ZodValidationPipe(simulatorPositionBodySchema))
  async setPosition(@Body() body: SimulatorPositionBodyDto): Promise<{ ok: boolean }> {
    const { driverId, lat, lng, geohash } = body;
    const client = this.redis.getClient();
    if (!client) return { ok: false };
    const key = `${KEY_PREFIX}${driverId}`;
    const value = JSON.stringify({ lat, lng, geohash });
    await client.set(key, value, 'EX', TTL_SEC);
    return { ok: true };
  }

  /**
   * Get current simulated position for a driver (polled by phone when in simulator mode).
   */
  @Get('position')
  @ApiOperation({ summary: 'Get simulated position for driver' })
  async getPosition(
    @Query(new ZodValidationPipe(simulatorPositionQuerySchema)) query: SimulatorPositionQueryDto
  ): Promise<{ lat: number; lng: number; geohash: string } | null> {
    const { driverId } = query;
    const client = this.redis.getClient();
    if (!client) return null;
    const key = `${KEY_PREFIX}${driverId}`;
    const raw = await client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { lat: number; lng: number; geohash: string };
    } catch {
      return null;
    }
  }
}
