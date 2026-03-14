import { Injectable, Logger } from '@nestjs/common';
import type { AdSelectionStrategy, SelectionInput, CandidateAd, AdInstructionResult } from '../interfaces/ad-selection.interface';
import { CampaignStatsService } from '../services/campaign-stats.service';
import { QualityScoreCalculator } from '../calculators/quality-score.calculator';
import { RelevanceCalculator } from '../calculators/relevance.calculator';
import { SecondPriceCalculator } from '../calculators/second-price.calculator';
import { BudgetPacingService } from '../services/budget-pacing.service';
import { FrequencyCapService } from '../services/frequency-cap.service';
import { ShareOfVoiceService } from '../services/share-of-voice.service';
import { ExplorationSelector, type ScoredCandidate } from '../selectors/exploration.selector';

const NEW_CAMPAIGN_THRESHOLD = parseInt(process.env['NEW_CAMPAIGN_THRESHOLD'] ?? '100', 10);
const NEW_CAMPAIGN_BOOST = parseFloat(process.env['NEW_CAMPAIGN_BOOST'] ?? '1.5');
const DEFAULT_DISTANCE_METERS = 500;

@Injectable()
export class AdRankStrategy implements AdSelectionStrategy {
  name = 'AdRankStrategy';
  private readonly logger = new Logger(AdRankStrategy.name);

  constructor(
    private readonly statsService: CampaignStatsService,
    private readonly qualityCalc: QualityScoreCalculator,
    private readonly relevanceCalc: RelevanceCalculator,
    private readonly secondPriceCalc: SecondPriceCalculator,
    private readonly pacingService: BudgetPacingService,
    private readonly frequencyCapService: FrequencyCapService,
    private readonly sovService: ShareOfVoiceService,
    private readonly explorationSelector: ExplorationSelector,
  ) {}

  async apply(input: SelectionInput): Promise<
    | { override: true; instructions: AdInstructionResult[] }
    | { override: false; candidates: CandidateAd[] }
  > {
    const { candidates, context, driverId, geohash } = input;
    if (candidates.length === 0) return { override: false, candidates: [] };

    const campaignIds = [...new Set(candidates.map((c) => c.campaignId))];
    const statsMap = await this.statsService.getBulkStats(campaignIds);

    const deviceId = driverId;
    const geohash5 = (geohash ?? '').substring(0, 5) || 'unk';
    const { allowed, capped } = await this.frequencyCapService.filterCapped(
      campaignIds,
      deviceId,
      geohash5,
    );

    if (capped.length > 0) {
      this.logger.log({ msg: 'Frequency-capped campaigns removed', capped, remaining: allowed.length });
    }

    const cappedSet = new Set(capped);
    let eligible = candidates.filter((c) => !cappedSet.has(c.campaignId));
    if (eligible.length === 0 && candidates.length > 0) {
      this.logger.log({ msg: 'All campaigns frequency-capped; allowing all so user still sees an ad', driverId });
      eligible = candidates;
    }
    if (eligible.length === 0) return { override: false, candidates: [] };

    const scored = await this.scoreAll(eligible, statsMap, context, geohash5);
    const selected = this.explorationSelector.select(scored, undefined, driverId);
    this.applySecondPriceBilling(selected);
    this.assignPriority(selected);

    this.logAuctionResult(driverId, eligible.length, capped.length, selected);
    return { override: false, candidates: selected };
  }

  private async scoreAll(
    eligible: CandidateAd[],
    statsMap: Map<string, { ctr: number; impressionCount: number }>,
    context: SelectionInput['context'],
    geohash5: string,
  ): Promise<ScoredCandidate[]> {
    return Promise.all(
      eligible.map(async (c) => {
        const stats = statsMap.get(c.campaignId);
        const qualityScore = this.qualityCalc.compute({
          ctr: stats?.ctr ?? 0,
          impressionCount: stats?.impressionCount ?? 0,
          createdAt: c.createdAt ?? new Date(),
          budgetRemaining: c.budgetRemaining,
          dailyBudget: c.dailyBudget,
        });

        const relevanceScore = this.relevanceCalc.compute({
          distanceMeters: c.distanceMeters ?? DEFAULT_DISTANCE_METERS,
          context,
          headline: c.headline,
          body: c.body,
        });

        const pacingFactor = await this.pacingService.getPacingFactor(c.campaignId, c.dailyBudget);
        const sovPenalty = await this.sovService.getSovPenalty(c.businessId, geohash5);

        let adRank = c.cpm * qualityScore * relevanceScore * pacingFactor * sovPenalty;
        if ((stats?.impressionCount ?? 0) < NEW_CAMPAIGN_THRESHOLD) {
          adRank *= NEW_CAMPAIGN_BOOST;
        }

        return {
          candidate: { ...c, adRank, qualityScore, relevanceScore, pacingFactor, sovPenalty } as CandidateAd,
          score: adRank,
        };
      }),
    );
  }

  private applySecondPriceBilling(selected: CandidateAd[]): void {
    if (selected.length === 0) return;
    const winner = selected[0];
    winner.effectiveCpm = this.secondPriceCalc.compute({
      winnerCpm: winner.cpm,
      winnerQuality: winner.qualityScore ?? 1,
      winnerRelevance: winner.relevanceScore ?? 1,
      winnerPacing: winner.pacingFactor ?? 1,
      winnerSovPenalty: winner.sovPenalty ?? 1,
      runnerUpAdRank: selected.length >= 2 ? (selected[1].adRank ?? null) : null,
    });
  }

  private assignPriority(selected: CandidateAd[]): void {
    for (let i = 0; i < selected.length; i++) {
      selected[i].priority = selected.length - i;
    }
  }

  private logAuctionResult(driverId: string, eligible: number, capped: number, result: CandidateAd[]): void {
    this.logger.log({
      msg: 'Ad Auction Result',
      driverId,
      eligible,
      frequencyCapped: capped,
      candidates: result.map((c, idx) => ({
        name: c.businessId,
        cpm: c.cpm,
        qualityScore: +(c.qualityScore ?? 0).toFixed(4),
        relevanceScore: +(c.relevanceScore ?? 0).toFixed(4),
        pacingFactor: +(c.pacingFactor ?? 0).toFixed(4),
        sovPenalty: +(c.sovPenalty ?? 0).toFixed(4),
        adRank: +(c.adRank ?? 0).toFixed(2),
        effectiveCpm: c.effectiveCpm,
        selected: idx === 0,
      })),
    });
  }
}
