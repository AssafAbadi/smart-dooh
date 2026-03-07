import { Module } from '@nestjs/common';
import { TrafficDensityRepository } from './repositories/traffic-density.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TrafficDensityRepository],
  exports: [TrafficDensityRepository],
})
export class TrafficDensityModule {}
