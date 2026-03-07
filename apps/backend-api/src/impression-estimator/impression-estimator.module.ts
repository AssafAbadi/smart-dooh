import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImpressionEstimatorService } from './impression-estimator.service';
import { LiveEventRepository } from './repositories/live-event.repository';
import { TrafficDensityModule } from '../traffic-density/traffic-density.module';

@Module({
  imports: [TrafficDensityModule, PrismaModule],
  providers: [ImpressionEstimatorService, LiveEventRepository],
  exports: [ImpressionEstimatorService, LiveEventRepository],
})
export class ImpressionEstimatorModule {}
