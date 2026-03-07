import { Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { RedisModule } from '../redis/redis.module';
import { ContextEngineModule } from '../context-engine/context-engine.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { ImpressionEstimatorModule } from '../impression-estimator/impression-estimator.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { EmergencyAlertRepository } from './repositories/emergency-alert.repository';
import { CampaignCreativeRepository } from './repositories/campaign-creative.repository';
import { TargetingPreferencesRepository } from './repositories/targeting-preferences.repository';
import { EmergencyRulesStrategy } from './strategies/emergency-rules.strategy';
import { ProximityStrategy } from './strategies/proximity.strategy';
import { PaidPriorityStrategy } from './strategies/paid-priority.strategy';
import { ContextRulesStrategy } from './strategies/context-rules.strategy';
import { WeatherCalculator } from './calculators/weather.calculator';
import { EventCalculator } from './calculators/event.calculator';
import { EventBoostStrategy } from './strategies/event-boost.strategy';
import { AdSelectionEngineService } from './ad-selection-engine.service';
import { AdSelectionFacade } from './ad-selection-facade.service';
import { AdSelectionController } from './ad-selection.controller';

@Module({
  imports: [RedisModule, ContextEngineModule, ExternalApiModule, ImpressionEstimatorModule, ObservabilityModule, RateLimitModule],
  controllers: [AdSelectionController],
  providers: [
    EmergencyAlertRepository,
    { provide: TOKENS.IEmergencyAlertRepository, useExisting: EmergencyAlertRepository },
    CampaignCreativeRepository,
    TargetingPreferencesRepository,
    WeatherCalculator,
    EventCalculator,
    EmergencyRulesStrategy,
    ProximityStrategy,
    PaidPriorityStrategy,
    EventBoostStrategy,
    ContextRulesStrategy,
    AdSelectionEngineService,
    AdSelectionFacade,
  ],
})
export class AdSelectionModule {}
