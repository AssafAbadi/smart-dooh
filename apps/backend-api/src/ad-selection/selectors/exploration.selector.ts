import { Injectable, Logger } from '@nestjs/common';
import type { CandidateAd } from '../interfaces/ad-selection.interface';
import { WeightedSamplerService, type ScoredItem } from '../services/weighted-sampler.service';

export const DEFAULT_EXPLORATION_RATE = 0.15;
const EXPLORATION_RATE = parseFloat(process.env['EXPLORATION_RATE'] ?? String(DEFAULT_EXPLORATION_RATE));
const STICKY_WINNER_TTL_MS = 60_000;

export interface ScoredCandidate {
  candidate: CandidateAd;
  score: number;
}

interface StickyEntry {
  winnerId: string;
  candidateKey: string;
  expiresAt: number;
}

@Injectable()
export class ExplorationSelector {
  private readonly logger = new Logger(ExplorationSelector.name);
  private readonly stickyCache = new Map<string, StickyEntry>();

  constructor(private readonly sampler: WeightedSamplerService) {}

  select(scored: ScoredCandidate[], forceExplore?: boolean, driverId?: string): CandidateAd[] {
    if (scored.length === 0) return [];

    const candidateKey = scored.map((s) => s.candidate.campaignId).sort().join(',');
    const cacheKey = driverId ?? '_default';

    const sticky = this.stickyCache.get(cacheKey);
    if (sticky && sticky.candidateKey === candidateKey && sticky.expiresAt > Date.now()) {
      const stickyWinner = scored.find((s) => s.candidate.campaignId === sticky.winnerId);
      if (stickyWinner) {
        const rest = scored
          .filter((s) => s.candidate.campaignId !== sticky.winnerId)
          .sort((a, b) => b.score - a.score)
          .map((s) => s.candidate);
        return [stickyWinner.candidate, ...rest];
      }
    }

    const useExploration = forceExplore ?? Math.random() < EXPLORATION_RATE;

    let result: CandidateAd[];
    if (useExploration) {
      const idx = Math.floor(Math.random() * scored.length);
      const explorationPick = scored[idx].candidate;
      const rest = scored.filter((_, i) => i !== idx);
      const sampledRest = this.sampler.sample(
        rest.map((s): ScoredItem<CandidateAd> => ({ item: s.candidate, score: s.score })),
        rest.length,
      );
      this.logger.log({ msg: 'Exploration mode', explorationPick: explorationPick.businessId });
      result = [explorationPick, ...sampledRest];
    } else {
      result = this.sampler.sample(
        scored.map((s): ScoredItem<CandidateAd> => ({ item: s.candidate, score: s.score })),
        scored.length,
      );
    }

    if (result.length > 0) {
      this.stickyCache.set(cacheKey, {
        winnerId: result[0].campaignId,
        candidateKey,
        expiresAt: Date.now() + STICKY_WINNER_TTL_MS,
      });
    }

    return result;
  }

  get explorationRate(): number {
    return EXPLORATION_RATE;
  }
}
