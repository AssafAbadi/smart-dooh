import { Injectable } from '@nestjs/common';

export const SECOND_PRICE_EPSILON = 1;
export const SOLO_FLOOR_RATIO = 0.5;
export const FLOOR_CPM = 1;

export interface SecondPriceInput {
  winnerCpm: number;
  winnerQuality: number;
  winnerRelevance: number;
  winnerPacing: number;
  winnerSovPenalty: number;
  runnerUpAdRank: number | null;
}

@Injectable()
export class SecondPriceCalculator {
  compute(input: SecondPriceInput): number {
    const { winnerCpm, runnerUpAdRank } = input;
    if (runnerUpAdRank == null) {
      return Math.max(FLOOR_CPM, Math.round(winnerCpm * SOLO_FLOOR_RATIO));
    }
    const denom =
      (input.winnerQuality || 1) *
      (input.winnerRelevance || 1) *
      (input.winnerPacing || 1) *
      (input.winnerSovPenalty || 1);
    if (denom <= 0) return winnerCpm;
    const secondPrice = runnerUpAdRank / denom + SECOND_PRICE_EPSILON;
    return Math.min(winnerCpm, Math.round(secondPrice));
  }
}
