import { Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { AuthModule } from '../auth/auth.module';
import { BusinessRepository } from '../business/repositories/business.repository';
import { DriverPreferencesRepository } from '../business/repositories/driver-preferences.repository';
import { ExternalApiModule } from '../external-api/external-api.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { RedisModule } from '../redis/redis.module';
import { ContextEngineController } from './context-engine.controller';
import { ContextEngineService } from './context-engine.service';

@Module({
  imports: [AuthModule, ExternalApiModule, RateLimitModule, RedisModule],
  controllers: [ContextEngineController],
  providers: [
    ContextEngineService,
    BusinessRepository,
    { provide: TOKENS.IBusinessRepository, useExisting: BusinessRepository },
    DriverPreferencesRepository,
    {
      provide: TOKENS.IDriverPreferencesRepository,
      useExisting: DriverPreferencesRepository,
    },
  ],
  exports: [ContextEngineService],
})
export class ContextEngineModule {}
