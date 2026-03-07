import { Body, Controller, Get, Logger, Post, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImpressionsService } from './impressions.service';
import { recordImpressionSchema, type RecordImpressionDto } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';

/**
 * Idempotent impression recording: same client_uuid yields a single DB record.
 * Used by mobile app and Mock Driver Simulator for idempotency verification.
 */
@ApiTags('Impressions')
@Controller('impressions')
export class ImpressionsController {
  private readonly logger = new Logger(ImpressionsController.name);

  constructor(private readonly impressionsService: ImpressionsService) {}

  @Post()
  @ApiOperation({ summary: 'Record an impression (idempotent by client_uuid)' })
  @UsePipes(new ZodValidationPipe(recordImpressionSchema))
  async record(@Body() body: RecordImpressionDto) {
    const { client_uuid, campaignId, creativeId, deviceId, driverId, lat, lng, geohash, speedKmh, dwellSeconds } = body;
    this.logger.log({
      client_uuid: client_uuid?.slice(0, 8),
      campaignId,
      driverId: driverId ?? null,
      hasDriverId: !!driverId,
      msg: 'POST impressions record incoming',
    });
    await this.impressionsService.recordIdempotent({
      clientUuid: client_uuid,
      campaignId,
      creativeId,
      deviceId,
      driverId,
      lat,
      lng,
      geohash,
      speedKmh,
      dwellSeconds,
    });
    this.logger.log({ client_uuid: client_uuid?.slice(0, 8), campaignId, driverId: driverId ?? null, msg: 'POST impressions record done' });
    return { ok: true };
  }

  /**
   * For tests/simulator: count impressions (optionally by client_uuid).
   */
  @Get('count')
  @ApiOperation({ summary: 'Count impressions (optional filter by client_uuid)' })
  async count(@Query('client_uuid') clientUuid?: string) {
    const count = await this.impressionsService.count(clientUuid?.trim() || undefined);
    return { count };
  }
}
