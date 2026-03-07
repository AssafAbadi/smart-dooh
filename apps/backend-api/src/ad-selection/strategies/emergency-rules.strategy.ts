import { Inject, Injectable } from '@nestjs/common';
import type {
  AdSelectionStrategy,
  SelectionInput,
  AdInstructionResult,
} from '../interfaces/ad-selection.interface';
import type { IEmergencyAlertRepository } from '../interfaces/ad-selection.interface';
import { TOKENS } from '../../core/constants/tokens';
import { ConfigService } from '../../config/config.service';

/**
 * 1. EmergencyRulesStrategy: Query active emergency_alerts for driver's location.
 * If alert exists, override everything.
 */
@Injectable()
export class EmergencyRulesStrategy implements AdSelectionStrategy {
  name = 'EmergencyRulesStrategy';

  constructor(
    @Inject(TOKENS.IEmergencyAlertRepository)
    private readonly emergencyRepo: IEmergencyAlertRepository,
    private readonly config: ConfigService,
  ) {}

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: AdInstructionResult[] }
    | { override: false; candidates: import('../interfaces/ad-selection.interface').CandidateAd[] }
  > {
    if (this.config.get('SKIP_EMERGENCY_FOR_TESTING') === 'true') return { override: false, candidates: input.candidates };
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
