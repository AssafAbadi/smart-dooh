import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { driverLocationBodySchema, type DriverLocationBodyDto } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { DriverLocationService } from './driver-location.service';

/**
 * Real-time driver location from the mobile app (GPS).
 * Call every 5–10 seconds so the backend has current position and can identify area/neighborhood via Google Geocoding.
 */
@ApiTags('Driver')
@Controller('driver')
export class DriverLocationController {
  constructor(private readonly driverLocationService: DriverLocationService) {}

  @Post('location')
  @ApiOperation({ summary: 'Report driver GPS location (real-time)' })
  @UsePipes(new ZodValidationPipe(driverLocationBodySchema))
  async postLocation(@Body() body: DriverLocationBodyDto) {
    return this.driverLocationService.upsertLocation(body);
  }
}
