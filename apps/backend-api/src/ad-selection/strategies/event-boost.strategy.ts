import { Injectable, Logger } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, AdInstructionResult } from '../interfaces/ad-selection.interface';
import { EventCalculator } from '../calculators/event.calculator';

/**
 * EventBoostStrategy: Boost priority for all candidates when near a live event (e.g. stadium, theater).
 * Runs after PaidPriority; multiplies priority via EventCalculator.
 */
@Injectable()
export class EventBoostStrategy implements AdSelectionStrategy {
  name = 'EventBoostStrategy';
  private readonly logger = new Logger(EventBoostStrategy.name);

  constructor(private readonly eventCalculator: EventCalculator) {}

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: AdInstructionResult[] }
    | { override: false; candidates: import('../interfaces/ad-selection.interface').CandidateAd[] }
  > {
    const { candidates, lat, lng } = input;
    if (candidates.length === 0) return { override: false, candidates: [] };

    const boost = await this.eventCalculator.getBoostForLocation(lat, lng);
    this.logger.log({
      msg: '[AdSelectionEngine] eventBoost applied',
      eventBoost: boost,
      lat,
      lng,
    });
    const boosted = candidates.map((c) => ({
      ...c,
      priority: Math.round((c.priority ?? 0) * boost),
    }));
    return { override: false, candidates: boosted };
  }
}
