import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { heartbeatBodySchema, type HeartbeatBodyDto } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { CarScreenService } from './car-screen.service';

/**
 * Heartbeat: update car_screens.last_heartbeat (client should call every 2 minutes).
 * deviceId is required (validated per security-validate-all-input).
 */
@ApiTags('Car Screen')
@Controller('car-screens')
export class CarScreenController {
  constructor(private readonly carScreenService: CarScreenService) {}

  @Post('heartbeat')
  @ApiOperation({ summary: 'Car screen heartbeat' })
  @UsePipes(new ZodValidationPipe(heartbeatBodySchema))
  async heartbeat(@Body() body: HeartbeatBodyDto) {
    await this.carScreenService.updateHeartbeat(body.deviceId.trim(), body.driverId);
    return { ok: true };
  }
}
