import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { contextQuerySchema, type ContextQueryDto } from '@smart-dooh/shared-dto';
import { driverPreferencesUpdateSchema, type DriverPreferencesUpdateDto } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { ContextEngineService } from './context-engine.service';
import { DeviceRateLimitGuard } from '../rate-limit/guards/device-rate-limit.guard';
import type { DriverPreferencesRecord } from '../core/interfaces/driver-preferences-repository.interface';

/** Parse and validate body for driver-preferences; handles body arriving as string (e.g. React Native / Nest+Fastify). */
function parseDriverPreferencesBody(raw: unknown): DriverPreferencesUpdateDto {
  const obj = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
  const result = driverPreferencesUpdateSchema.safeParse(obj);
  if (!result.success) {
    const messages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new BadRequestException(messages.join('; '));
  }
  return result.data;
}

function defaultDriverPreferences(): DriverPreferencesRecord {
  return {
    preference_tags: [],
    excludedLanguages: [],
  };
}

/**
 * Context Engine API: businesses filtered by driver preferences; optional POIs + weather.
 * Device rate limit: 1 req/5s (429 with retryAfter when exceeded).
 */
@ApiTags('Context Engine')
@Controller('context-engine')
@UseGuards(DeviceRateLimitGuard)
export class ContextEngineController {
  private readonly logger = new Logger(ContextEngineController.name);

  constructor(private readonly contextEngine: ContextEngineService) {}

  @Get('businesses/driver/:driverId')
  @ApiOperation({ summary: 'Get businesses filtered by driver preferences' })
  async getFilteredBusinesses(@Param('driverId') driverId: string) {
    const businesses = await this.contextEngine.getFilteredBusinessesForDriver(driverId);
    this.logger.log({ driverId, businessesCount: businesses.length, msg: `GET businesses/driver/${driverId}` });
    return { businesses };
  }

  @Get('driver-preferences/:driverId')
  @ApiOperation({ summary: 'Get driver preferences' })
  async getDriverPreferences(@Param('driverId') driverId: string) {
    const prefs = await this.contextEngine.getDriverPreferences(driverId);
    const tags = prefs?.preference_tags ?? [];
    this.logger.log({ driverId, preference_tags: tags, msg: `GET driver-preferences/${driverId}` });
    return { preferences: prefs ?? defaultDriverPreferences() };
  }

  @Patch('driver-preferences/:driverId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver preferences' })
  async updateDriverPreferences(
    @Param('driverId') driverId: string,
    @Body() rawBody: unknown
  ) {
    const body = parseDriverPreferencesBody(rawBody);
    this.logger.log({
      driverId,
      preference_tags: body.preference_tags,
      excludedLanguages: body.excludedLanguages,
      msg: 'PATCH driver-preferences incoming',
    });
    try {
      const prefs = await this.contextEngine.updateDriverPreferences(driverId, body);
      this.logger.log({
        driverId,
        preference_tags: prefs.preference_tags,
        msg: 'PATCH driver-preferences OK',
      });
      return { preferences: prefs };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        {
          driverId,
          err: msg,
          bodyPreferenceTags: body.preference_tags,
          stack: err instanceof Error ? err.stack : undefined,
          msg: 'PATCH driver-preferences failed',
        },
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  @Post('driver-preferences/:driverId')
  @HttpCode(HttpStatus.OK)
  async updateDriverPreferencesPost(
    @Param('driverId') driverId: string,
    @Body() rawBody: unknown
  ) {
    const body = parseDriverPreferencesBody(rawBody);
    this.logger.log({
      driverId,
      preference_tags: body.preference_tags,
      excludedLanguages: body.excludedLanguages,
      msg: 'POST driver-preferences incoming',
    });
    try {
      const prefs = await this.contextEngine.updateDriverPreferences(driverId, body);
      this.logger.log({
        driverId,
        preference_tags: prefs.preference_tags,
        msg: 'POST driver-preferences OK',
      });
      return { preferences: prefs };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        {
          driverId,
          err: msg,
          bodyPreferenceTags: body.preference_tags,
          stack: err instanceof Error ? err.stack : undefined,
          msg: 'POST driver-preferences failed',
        },
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /**
   * Full context: businesses + nearby POIs + weather. Query validated with contextQuerySchema.
   */
  @Get('context')
  @ApiOperation({ summary: 'Get full context (businesses, POIs, weather) for location' })
  async getContext(
    @Query(new ZodValidationPipe(contextQuerySchema)) query: ContextQueryDto
  ) {
    const { driverId, deviceId, lat, lng, geohash } = query;
    const result = await this.contextEngine.getContextWithIntegrations(driverId, deviceId, lat, lng, geohash);
    this.logger.log({ driverId, businessesCount: result.businesses.length, poisCount: result.pois.length, msg: 'GET context' });
    return result;
  }
}
