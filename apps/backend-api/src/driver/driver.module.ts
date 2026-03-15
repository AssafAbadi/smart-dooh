import { Module } from '@nestjs/common';
import { ExternalApiModule } from '../external-api/external-api.module';
import { DriverLocationController } from './driver-location.controller';
import { DriverLocationService } from './driver-location.service';
import { DriverPushTokenController } from './driver-push-token.controller';
import { DriverPushTokenService } from './driver-push-token.service';
import { DriverRepository } from './repositories/driver.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ExternalApiModule],
  controllers: [DriverLocationController, DriverPushTokenController],
  providers: [DriverRepository, DriverLocationService, DriverPushTokenService],
  exports: [DriverRepository, DriverLocationService],
})
export class DriverModule {}
