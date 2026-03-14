import { Body, Controller, Get, Inject, Logger, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { rankedQuerySchema, type RankedQueryDto } from '@smart-dooh/shared-dto';
import { selectBodySchema, type SelectBodyDto } from '@smart-dooh/shared-dto';
import { TOKENS } from '../core/constants/tokens';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { DeviceRateLimitGuard } from '../rate-limit/guards/device-rate-limit.guard';
import { AdSelectionFacade } from './ad-selection-facade.service';
import { AdInstructionMapper } from './mappers/ad-instruction.mapper';

const DISPLAY_LAST_KEY_PREFIX = 'display:last:';
const DISPLAY_DIRECTION_KEY_PREFIX = 'display:direction:';
const DISPLAY_DIRECTION_TTL_SEC = 30;
/** 10 min so display and app keep showing last ad when on cellular and ranked requests occasionally fail (e.g. ngrok). */
const DISPLAY_LAST_TTL_SEC = 600;

/**
 * AdSelection API: returns ranked AdInstruction[].
 * Validation via Zod; orchestration delegated to AdSelectionFacade.
 * Last result per driverId is cached so the display URL can mirror the app.
 */
@ApiTags('Ad Selection')
@Controller('ad-selection')
@UseGuards(DeviceRateLimitGuard)
export class AdSelectionController {
  private readonly logger = new Logger(AdSelectionController.name);

  constructor(
    private readonly facade: AdSelectionFacade,
    private readonly mapper: AdInstructionMapper,
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
  ) {}

  @Get('ranked')
  @ApiOperation({ summary: 'Get ranked ad instructions by driver and location' })
  async getRanked(
    @Query(new ZodValidationPipe(rankedQuerySchema)) query: RankedQueryDto,
    @Query('debug') debug?: string,
  ) {
    const result = await this.facade.getRanked(query);
    if ((result.instructions?.length ?? 0) > 0) await this.cacheLastForDisplay(query.driverId, result);
    this.logger.log({ driverId: query.driverId, instructionsCount: result.instructions?.length ?? 0, msg: 'GET ranked' });
    if (debug === '1') return result;
    return { instructions: this.mapper.toPublicList(result.instructions) };
  }

  @Get('ranked/:driverId')
  @ApiOperation({ summary: 'Get ranked ad instructions for display/billboard (default Tel Aviv location)' })
  @ApiParam({ name: 'driverId', example: 'driver-1' })
  async getRankedByDriverId(@Param('driverId') driverId: string) {
    const result = await this.facade.getRankedForDisplay(driverId);
    if ((result.instructions?.length ?? 0) > 0) await this.cacheLastForDisplay(driverId, result);
    return result;
  }

  @Get('last/:driverId')
  @ApiOperation({ summary: 'Last ranked result for driver (for display mirror)' })
  @ApiParam({ name: 'driverId', example: 'driver-1' })
  async getLastForDisplay(@Param('driverId') driverId: string) {
    const client = this.redis.getClient() as { get(key: string): Promise<string | null> } | null;
    if (!client) {
      this.logger.warn({ driverId, msg: 'Display last: Redis client is null (REDIS_URL unset or Redis down). Return empty so display shows Mirror.' });
      return { instructions: [] };
    }
    const key = `${DISPLAY_LAST_KEY_PREFIX}${driverId}`;
    const raw = await client.get(key);
    if (!raw) {
      this.logger.log({ driverId, msg: 'Display last: cache miss (no ranked result cached yet). Return empty.' });
      return { instructions: [] };
    }
    try {
      const data = JSON.parse(raw) as { instructions: Array<{ direction?: string; businessLat?: number; businessLng?: number; [k: string]: unknown }> };
      this.logger.log({ driverId, instructionsCount: data.instructions?.length ?? 0, msg: 'Display last: cache hit' });
      const phoneDir = await client.get(`${DISPLAY_DIRECTION_KEY_PREFIX}${driverId}`);
      if (phoneDir && data.instructions?.length) {
        data.instructions = data.instructions.map((inst) => ({ ...inst, direction: phoneDir }));
      }
      return data;
    } catch {
      return { instructions: [] };
    }
  }

  private async cacheLastForDisplay(driverId: string, result: { instructions: unknown[] }): Promise<void> {
    const client = this.redis.getClient() as { setex(key: string, ttl: number, value: string): Promise<unknown> } | null;
    if (!client) {
      this.logger.warn({ driverId, msg: 'Cannot cache for display: Redis client is null. Set REDIS_URL and ensure Redis is running.' });
      return;
    }
    const key = `${DISPLAY_LAST_KEY_PREFIX}${driverId}`;
    await client.setex(key, DISPLAY_LAST_TTL_SEC, JSON.stringify(result));
    this.logger.log({ driverId, instructionsCount: result.instructions?.length ?? 0, msg: 'Cached last for display' });
  }

  @Post('direction/:driverId')
  @ApiOperation({ summary: 'Phone sends current relative arrow direction for display sync' })
  @ApiParam({ name: 'driverId', example: 'driver-1' })
  async postDirection(
    @Param('driverId') driverId: string,
    @Body() body: { direction: string },
  ) {
    const valid = ['up', 'down', 'left', 'right'];
    const dir = body?.direction;
    if (!dir || !valid.includes(dir)) return { ok: false };
    const client = this.redis.getClient() as { setex(key: string, ttl: number, value: string): Promise<unknown> } | null;
    if (!client) return { ok: false };
    await client.setex(`${DISPLAY_DIRECTION_KEY_PREFIX}${driverId}`, DISPLAY_DIRECTION_TTL_SEC, dir);
    return { ok: true };
  }

  @Post('select')
  @ApiOperation({ summary: 'Select ad instructions from body (candidates + context)' })
  @UsePipes(new ZodValidationPipe(selectBodySchema))
  async postSelect(@Body() body: SelectBodyDto) {
    return this.facade.postSelect(body);
  }
}
