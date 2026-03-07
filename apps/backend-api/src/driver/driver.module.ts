import { Module } from '@nestjs/common';
import { ExternalApiModule } from '../external-api/external-api.module';
import { DriverLocationController } from './driver-location.controller';
import { DriverLocationService } from './driver-location.service';
import { DriverRepository } from './repositories/driver.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ExternalApiModule],
  controllers: [DriverLocationController],
  providers: [DriverRepository, DriverLocationService],
  exports: [DriverRepository],
})
export class DriverModule {}
