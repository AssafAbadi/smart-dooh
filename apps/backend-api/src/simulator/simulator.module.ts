import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { SimulatorController } from './simulator.controller';

@Module({
  imports: [RedisModule],
  controllers: [SimulatorController],
})
export class SimulatorModule {}
