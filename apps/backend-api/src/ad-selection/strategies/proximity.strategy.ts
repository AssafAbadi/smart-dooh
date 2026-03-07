import { Injectable } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, CandidateAd } from '../interfaces/ad-selection.interface';

const BLE_BOOST_PRIORITY = 1000;

/**
 * 2. ProximityStrategy: If BLE hint 'IMMEDIATE' is received, boost priority of the specific business.
 */
@Injectable()
export class ProximityStrategy implements AdSelectionStrategy {
  name = 'ProximityStrategy';

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: import('../interfaces/ad-selection.interface').AdInstructionResult[] }
    | { override: false; candidates: CandidateAd[] }
  > {
    const hint = input.bleHint;
    if (!hint || hint.type !== 'IMMEDIATE' || !hint.businessId) {
      return { override: false, candidates: input.candidates };
    }

    const candidates: CandidateAd[] = input.candidates.map((c) => ({
      ...c,
      priority: c.businessId === hint.businessId ? (c.priority ?? 0) + BLE_BOOST_PRIORITY : (c.priority ?? 0),
    }));
    return { override: false, candidates };
  }
}
