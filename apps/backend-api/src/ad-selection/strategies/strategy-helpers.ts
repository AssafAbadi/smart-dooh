import type { AdInstructionResult, CandidateAd } from '../interfaces/ad-selection.interface';

export function candidateToInstruction(c: CandidateAd, placeholders?: Record<string, string>): AdInstructionResult {
  return {
    campaignId: c.campaignId,
    creativeId: c.creativeId,
    variantId: c.variantId,
    headline: c.headline,
    body: c.body,
    placeholders,
    imageUrl: c.imageUrl,
    couponCode: c.couponCode,
    ttlSeconds: 60,
    priority: c.priority,
    businessId: c.businessId,
    effectiveCpm: c.effectiveCpm,
    adRank: c.adRank,
    qualityScore: c.qualityScore,
    relevanceScore: c.relevanceScore,
    pacingFactor: c.pacingFactor,
    sovPenalty: c.sovPenalty,
  };
}
