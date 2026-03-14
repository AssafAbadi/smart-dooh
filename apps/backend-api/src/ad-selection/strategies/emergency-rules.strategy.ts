import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  AdSelectionStrategy,
  SelectionInput,
  AdInstructionResult,
} from '../interfaces/ad-selection.interface';
import type { IEmergencyAlertRepository } from '../interfaces/ad-selection.interface';
import { TOKENS } from '../../core/constants/tokens';
import { ConfigService } from '../../config/config.service';
import { EmergencyService } from '../../emergency/emergency.service';

/**
 * 1. EmergencyRulesStrategy: checks Pikud HaOref real-time alert first, then falls
 *    back to legacy EmergencyAlert DB records. Override with shelter navigation data.
 */
@Injectable()
export class EmergencyRulesStrategy implements AdSelectionStrategy {
  name = 'EmergencyRulesStrategy';
  private readonly logger = new Logger(EmergencyRulesStrategy.name);

  constructor(
    @Inject(TOKENS.IEmergencyAlertRepository)
    private readonly emergencyRepo: IEmergencyAlertRepository,
    private readonly config: ConfigService,
    @Optional() private readonly emergencyService?: EmergencyService,
  ) {}

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: AdInstructionResult[] }
    | { override: false; candidates: import('../interfaces/ad-selection.interface').CandidateAd[] }
  > {
    if (this.config.get('SKIP_EMERGENCY_FOR_TESTING') === 'true') {
      return { override: false, candidates: input.candidates };
    }

    if (this.emergencyService) {
      const emergencyData = await this.emergencyService.getEmergencyDataForLocation(input.lat, input.lng);
      if (emergencyData) {
        this.logger.warn({ msg: 'Pikud HaOref alert override', lat: input.lat, lng: input.lng });
        const instruction: AdInstructionResult = {
          campaignId: 'emergency',
          creativeId: `pikud-${Date.now()}`,
          headline: emergencyData.alertHeadline,
          body: `מקלט: ${emergencyData.shelterAddress} (${emergencyData.distanceMeters}m)`,
          priority: 9999,
          emergencyData,
        };
        return { override: true, instructions: [instruction] };
      }
    }

    const alert = await this.emergencyRepo.findActiveForLocation(input.lat, input.lng);
    if (!alert) return { override: false, candidates: input.candidates };

    const instruction: AdInstructionResult = {
      campaignId: 'emergency',
      creativeId: alert.id,
      headline: alert.headline,
      body: alert.body ?? undefined,
      priority: 9999,
    };
    return { override: true, instructions: [instruction] };
  }
}
