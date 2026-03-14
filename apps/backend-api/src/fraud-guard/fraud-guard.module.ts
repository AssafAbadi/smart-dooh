import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { SpeedFraudRule } from './rules/speed-fraud.rule';
import { LoopFraudRule } from './rules/loop-fraud.rule';
import { SpoofingFraudRule } from './rules/spoofing-fraud.rule';
import { FraudGuardService } from './fraud-guard.service';

@Module({
  imports: [RedisModule],
  providers: [SpeedFraudRule, LoopFraudRule, SpoofingFraudRule, FraudGuardService],
  exports: [FraudGuardService],
})
export class FraudGuardModule {}
