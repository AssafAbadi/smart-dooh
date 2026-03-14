import { Module, forwardRef } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { RedisModule } from '../redis/redis.module';
import { ContextEngineModule } from '../context-engine/context-engine.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { ImpressionEstimatorModule } from '../impression-estimator/impression-estimator.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { EmergencyModule } from '../emergency/emergency.module';
import { FraudGuardModule } from '../fraud-guard/fraud-guard.module';
import { TimeModule } from '../core/time/time.module';
import { EmergencyAlertRepository } from './repositories/emergency-alert.repository';
import { CampaignCreativeRepository } from './repositories/campaign-creative.repository';
import { TargetingPreferencesRepository } from './repositories/targeting-preferences.repository';
import { EmergencyRulesStrategy } from './strategies/emergency-rules.strategy';
import { ProximityStrategy } from './strategies/proximity.strategy';
import { EventBoostStrategy } from './strategies/event-boost.strategy';
import { AdRankStrategy } from './strategies/ad-rank.strategy';
import { WeatherCalculator } from './calculators/weather.calculator';
import { EventCalculator } from './calculators/event.calculator';
import { QualityScoreCalculator } from './calculators/quality-score.calculator';
import { RelevanceCalculator } from './calculators/relevance.calculator';
import { SecondPriceCalculator } from './calculators/second-price.calculator';
import { ExplorationSelector } from './selectors/exploration.selector';
import { CampaignStatsService } from './services/campaign-stats.service';
import { FrequencyCapService } from './services/frequency-cap.service';
import { BudgetPacingService } from './services/budget-pacing.service';
import { ShareOfVoiceService } from './services/share-of-voice.service';
import { WeightedSamplerService } from './services/weighted-sampler.service';
import { AdSelectionEngineService } from './ad-selection-engine.service';
import { AdSelectionFacade } from './ad-selection-facade.service';
import { AdInstructionMapper } from './mappers/ad-instruction.mapper';
import { AdSelectionController } from './ad-selection.controller';

@Module({
  imports: [RedisModule, ContextEngineModule, ExternalApiModule, ImpressionEstimatorModule, ObservabilityModule, RateLimitModule, forwardRef(() => EmergencyModule), FraudGuardModule, TimeModule],
  controllers: [AdSelectionController],
  providers: [
    EmergencyAlertRepository,
    { provide: TOKENS.IEmergencyAlertRepository, useExisting: EmergencyAlertRepository },
    CampaignCreativeRepository,
    TargetingPreferencesRepository,
    WeatherCalculator,
    EventCalculator,
    QualityScoreCalculator,
    RelevanceCalculator,
    SecondPriceCalculator,
    ExplorationSelector,
    CampaignStatsService,
    FrequencyCapService,
    BudgetPacingService,
    ShareOfVoiceService,
    WeightedSamplerService,
    EmergencyRulesStrategy,
    ProximityStrategy,
    EventBoostStrategy,
    AdRankStrategy,
    AdSelectionEngineService,
    AdSelectionFacade,
    AdInstructionMapper,
  ],
  exports: [CampaignStatsService, FrequencyCapService, BudgetPacingService, ShareOfVoiceService],
})
export class AdSelectionModule {}
