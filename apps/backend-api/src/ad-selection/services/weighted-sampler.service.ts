import { Injectable, Logger } from '@nestjs/common';

export interface ScoredItem<T> {
  item: T;
  score: number;
}

@Injectable()
export class WeightedSamplerService {
  private readonly logger = new Logger(WeightedSamplerService.name);

  /**
   * Weighted random sampling without replacement.
   * Probability of selection is proportional to score.
   */
  sample<T>(items: ScoredItem<T>[], count: number): T[] {
    if (items.length === 0) return [];
    if (items.length <= count) {
      return items
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((i) => i.item);
    }

    const pool = items.map((i) => ({ ...i }));
    const selected: T[] = [];

    for (let i = 0; i < count && pool.length > 0; i++) {
      const totalScore = pool.reduce((sum, p) => sum + Math.max(p.score, 0), 0);
      if (totalScore <= 0) {
        const idx = Math.floor(Math.random() * pool.length);
        selected.push(pool.splice(idx, 1)[0].item);
        continue;
      }

      let rand = Math.random() * totalScore;
      let chosenIdx = pool.length - 1;
      for (let j = 0; j < pool.length; j++) {
        rand -= Math.max(pool[j].score, 0);
        if (rand <= 0) {
          chosenIdx = j;
          break;
        }
        if (rand <= Number.EPSILON * totalScore) {
          chosenIdx = j;
          break;
        }
      }
      selected.push(pool.splice(chosenIdx, 1)[0].item);
    }

    return selected;
  }
}
