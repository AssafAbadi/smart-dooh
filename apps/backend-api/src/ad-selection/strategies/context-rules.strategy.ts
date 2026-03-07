import { Injectable } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, CandidateAd } from '../interfaces/ad-selection.interface';
import type { TargetingPreferencesRecord } from '../interfaces/targeting-preferences.interface';
import { TargetingPreferencesRepository } from '../repositories/targeting-preferences.repository';
import { WeatherCalculator } from '../calculators/weather.calculator';

/**
 * 4. ContextRulesStrategy: Match weather, time, POI density, and business targeting preferences.
 */
@Injectable()
export class ContextRulesStrategy implements AdSelectionStrategy {
  name = 'ContextRulesStrategy';

  constructor(
    private readonly targetingRepo: TargetingPreferencesRepository,
    private readonly weatherCalculator: WeatherCalculator,
  ) {}

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: import('../interfaces/ad-selection.interface').AdInstructionResult[] }
    | { override: false; candidates: CandidateAd[] }
  > {
    const { context, candidates } = input;
    if (candidates.length === 0) return { override: false, candidates: [] };

    const businessIds = [...new Set(candidates.map((c) => c.businessId))];
    const prefsList = await this.targetingRepo.findByBusinessIds(businessIds);
    const prefsByBusiness = new Map<string, TargetingPreferencesRecord>(
      prefsList.map((p) => [p.businessId, p])
    );

    const scored = candidates.map((c) => ({
      candidate: c,
      score: this.scoreCandidate(c, input.context, prefsByBusiness.get(c.businessId)),
    }));
    scored.sort((a, b) => b.score - a.score);
    const reordered = scored.map((s) => ({
      ...s.candidate,
      priority: (s.candidate.priority ?? 0) + Math.round(s.score),
    }));
    return { override: false, candidates: reordered };
  }

  private scoreCandidate(
    c: CandidateAd,
    ctx: SelectionInput['context'],
    prefs: TargetingPreferencesRecord | undefined
  ): number {
    let score = 0;
    const text = `${(c.headline ?? '').toLowerCase()} ${(c.body ?? '').toLowerCase()}`;

    if (ctx.weather) {
      score += this.weatherCalculator.score(ctx.weather, prefs);
      const isCold = ctx.weather.tempCelsius < 15;
      const isHot = ctx.weather.tempCelsius > 28;
      if (isCold && /hot|soup|coffee|tea/.test(text)) score += 20;
      if (isHot && /cold|ice|drink/.test(text)) score += 20;
    }

    const hour = ctx.timeHour;
    if (hour >= 17 && hour <= 19 && /happy hour|הנחה/.test(text)) score += 15;
    if (hour >= 11 && hour <= 14 && /lunch|צהריים/.test(text)) score += 10;
    if (ctx.poiDensity > 5) score += 5;
    return score;
  }
}
