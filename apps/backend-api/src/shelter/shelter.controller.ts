import { BadRequestException, Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShelterService } from './shelter.service';
import { ShelterSyncService } from './shelter-sync.service';
import { AdminApiKeyGuard } from '../admin/guards/admin-api-key.guard';
import { nearbyQuerySchema } from './interfaces/shelter.interface';

@ApiTags('Shelters')
@Controller('shelters')
export class ShelterController {
  private readonly logger = new Logger(ShelterController.name);

  constructor(
    private readonly shelterService: ShelterService,
    private readonly syncService: ShelterSyncService,
  ) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Find shelters near a GPS coordinate' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({ name: 'radius', type: Number, required: false, description: 'Search radius in meters (default 500)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Max results (default all within radius)' })
  async getNearby(@Query() rawQuery: Record<string, string>) {
    const parsed = nearbyQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const { lat, lng, radius, limit } = parsed.data;
    const shelters = await this.shelterService.findNearby(lat, lng, radius);
    const results = limit != null ? shelters.slice(0, limit) : shelters;
    return { shelters: results, total: shelters.length };
  }

  @Post('sync')
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Manually trigger shelter sync from Tel Aviv GIS (admin only)' })
  async triggerSync() {
    this.logger.log('Manual shelter sync requested');
    const result = await this.syncService.sync();
    return result;
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total shelter count' })
  async getCount() {
    const count = await this.shelterService.getShelterCount();
    return { count };
  }
}
