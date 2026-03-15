import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '../redis/redis.module';
import { ShelterModule } from '../shelter/shelter.module';
import { ObservabilityModule } from '../observability/observability.module';
import { DriverModule } from '../driver/driver.module';
import { PikudHaorefService } from './pikud-haoref.service';
import { EmergencyService } from './emergency.service';
import { EmergencyGateway } from './emergency.gateway';
import { EmergencyController } from './emergency.controller';
import { ShelterSelectorService } from './shelter-selector.service';
import { AlertStateRepository } from './repositories/alert-state.repository';
import { AlertZoneMatcher } from './alert-zone-matcher.service';
import { AlertProviderRegistry } from './alert-provider.registry';
import { ALERT_PROVIDERS_TOKEN } from './interfaces/alert-provider.interface';
import { TOKENS } from '../core/constants/tokens';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    RedisModule,
    ShelterModule,
    ObservabilityModule,
    DriverModule,
  ],
  controllers: [EmergencyController],
  providers: [
    PikudHaorefService,
    {
      provide: ALERT_PROVIDERS_TOKEN,
      useFactory: (pikud: PikudHaorefService) => [pikud],
      inject: [PikudHaorefService],
    },
    AlertProviderRegistry,
    AlertStateRepository,
    { provide: TOKENS.IAlertStateRepository, useExisting: AlertStateRepository },
    AlertZoneMatcher,
    { provide: TOKENS.IAlertZoneMatcher, useExisting: AlertZoneMatcher },
    EmergencyService,
    EmergencyGateway,
    ShelterSelectorService,
  ],
  exports: [EmergencyService, ShelterSelectorService],
})
export class EmergencyModule {}
