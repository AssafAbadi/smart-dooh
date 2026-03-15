import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { registerPushTokenSchema, type RegisterPushTokenDto } from '@smart-dooh/shared-dto';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { DriverPushTokenService } from './driver-push-token.service';

/**
 * Register Expo push token for a driver so they can receive remote notifications (e.g. emergency alerts).
 */
@ApiTags('Driver')
@Controller('drivers')
export class DriverPushTokenController {
  constructor(private readonly driverPushTokenService: DriverPushTokenService) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register push token for a driver' })
  @UsePipes(new ZodValidationPipe(registerPushTokenSchema))
  async registerPushToken(@Body() body: RegisterPushTokenDto): Promise<{ success: true }> {
    await this.driverPushTokenService.upsert(body.driverId, body.pushToken);
    return { success: true };
  }
}
