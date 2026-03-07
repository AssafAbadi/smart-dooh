import { Injectable } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, CandidateAd } from '../interfaces/ad-selection.interface';

/**
 * 3. PaidPriorityStrategy: Sort by CPM and budget priority.
 */
@Injectable()
export class PaidPriorityStrategy implements AdSelectionStrategy {
  name = 'PaidPriorityStrategy';

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: import('../interfaces/ad-selection.interface').AdInstructionResult[] }
    | { override: false; candidates: CandidateAd[] }
  > {
    const candidates = [...input.candidates].sort((a, b) => {
      if (b.cpm !== a.cpm) return b.cpm - a.cpm;
      return b.budgetRemaining - a.budgetRemaining;
    });
    return { override: false, candidates };
  }
}
