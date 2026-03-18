import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { registerPushTokenSchema, type RegisterPushTokenDto } from '@smart-dooh/shared-dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentDriverId } from '../auth/decorators/current-driver-id.decorator';
import { ZodValidationPipe } from '../core/pipes/zod-validation.pipe';
import { DriverPushTokenService } from './driver-push-token.service';

/**
 * Register Expo push token for the authenticated driver (identity from JWT).
 */
@ApiTags('Driver')
@Controller('drivers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverPushTokenController {
  constructor(private readonly driverPushTokenService: DriverPushTokenService) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register push token for a driver' })
  @UsePipes(new ZodValidationPipe(registerPushTokenSchema))
  async registerPushToken(
    @CurrentDriverId() driverId: string,
    @Body() body: RegisterPushTokenDto,
  ): Promise<{ success: true }> {
    await this.driverPushTokenService.upsert(driverId, body.pushToken);
    return { success: true };
  }
}
