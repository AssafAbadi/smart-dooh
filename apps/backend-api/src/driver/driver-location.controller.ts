import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { driverLocationBodySchema, type DriverLocationBodyDto } from '@smart-dooh/shared-dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentDriverId } from '../auth/decorators/current-driver-id.decorator';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { DriverLocationService } from './driver-location.service';

/**
 * Real-time driver location from the mobile app (GPS).
 * Driver identity from JWT; call every 5–10 seconds for area/neighborhood via Geocoding.
 */
@ApiTags('Driver')
@Controller('driver')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverLocationController {
  constructor(private readonly driverLocationService: DriverLocationService) {}

  @Post('location')
  @ApiOperation({ summary: 'Report driver GPS location (real-time)' })
  @UsePipes(new ZodValidationPipe(driverLocationBodySchema))
  async postLocation(
    @CurrentDriverId() driverId: string,
    @Body() body: DriverLocationBodyDto,
  ) {
    return this.driverLocationService.upsertLocation(driverId, body);
  }
}
