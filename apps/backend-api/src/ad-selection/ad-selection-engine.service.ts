import { Injectable } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, AdInstructionResult } from './interfaces/ad-selection.interface';
import { candidateToInstruction } from './strategies/strategy-helpers';
import { EmergencyRulesStrategy } from './strategies/emergency-rules.strategy';
import { ProximityStrategy } from './strategies/proximity.strategy';
import { EventBoostStrategy } from './strategies/event-boost.strategy';
import { AdRankStrategy } from './strategies/ad-rank.strategy';

/**
 * AdSelectionEngine: Runs strategy chain in order.
 * 1. EmergencyRulesStrategy → override if alert at location
 * 2. ProximityStrategy → boost BLE IMMEDIATE business
 * 3. EventBoostStrategy → multiply priority by live event boost near venues
 * 4. AdRankStrategy → bid * quality * relevance * pacing + freq caps + SOV + weighted sampling
 */
@Injectable()
export class AdSelectionEngineService {
  private readonly chain: AdSelectionStrategy[];

  constructor(
    emergency: EmergencyRulesStrategy,
    proximity: ProximityStrategy,
    eventBoost: EventBoostStrategy,
    adRank: AdRankStrategy,
  ) {
    this.chain = [emergency, proximity, eventBoost, adRank];
  }

  async select(input: SelectionInput): Promise<AdInstructionResult[]> {
    let candidates = input.candidates;

    for (const strategy of this.chain) {
      const result = await strategy.apply({ ...input, candidates });
      if (result.override === true) {
        return result.instructions;
      } else {
        candidates = result.candidates;
      }
    }

    return candidates.map((c) => candidateToInstruction(c));
  }
}
