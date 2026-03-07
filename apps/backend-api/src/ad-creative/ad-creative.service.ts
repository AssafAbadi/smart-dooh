import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { IRedisService } from '../core/interfaces/redis.interface';
import { TOKENS } from '../core/constants/tokens';
import { CreativeRepository } from './repositories/creative.repository';
import { TrendsService } from './services/trends.service';
import { LLMService } from './services/llm.service';
import { applyGlossary, getGlossaryTermsForPrompt } from './constants/glossary';
import type { TrendItem } from './interfaces/trends.interface';

const TRANSLATION_CACHE_PREFIX = 'creative_';
const TRANSLATION_CACHE_TTL_SEC = 86400; // 24h

export interface GenerateFromTrendParams {
  regionCode: string;
  campaignId: string;
  businessName: string;
  category: string;
  distanceMeters: number;
  couponCode: string;
  timeLeftMinutes: number;
  preferredLang?: string;
}

export interface TranslatedCreative {
  headline: string;
  body: string | null;
  lang: string;
}

@Injectable()
export class AdCreativeService {
  constructor(
    @Inject(TOKENS.IRedisService) private readonly redis: IRedisService,
    private readonly creativeRepo: CreativeRepository,
    private readonly trends: TrendsService,
    private readonly llm: LLMService
  ) {}

  private getClient(): Redis | null {
    return this.redis.getClient() as Redis | null;
  }

  /**
   * Scan current trends for the region, then generate a short punchy ad that ties the trend
   * to the business (e.g. "PM loves pizza" → "If the PM loves pizza, so do you. 10% off with
   * code X at Restaurant Y, 300m to the right – valid for the next hour.").
   * New creatives are created with status PENDING for admin approval.
   */
  async generateFromTrend(params: GenerateFromTrendParams): Promise<{
    id: string;
    headline: string;
    body: string | null;
    status: string;
    trendContext: string | null;
  }> {
    const trendsList = await this.trends.getTrendsForRegion(params.regionCode);
    const trendSummary = this.formatTrendsForPrompt(trendsList);
    const placeholdersNote = 'Use exactly these placeholders in the body/headline: [DISTANCE], [TIME_LEFT], [COUPON_CODE].';

    const systemPrompt = `You are an ad copywriter for a digital out-of-home ad platform in Israel.
Style: Short, punchy, Israeli slang when appropriate. Mix Hebrew and English if it fits (e.g. "חם על הפיצה" or "Just now").
${placeholdersNote}
Glossary terms to use as-is when relevant: ${getGlossaryTermsForPrompt().join(', ')}.`;

    const userPrompt = `Current trends in the region (use one to make the ad timely and catchy):
${trendSummary}

Business: ${params.businessName} (category: ${params.category}).
Distance: ${params.distanceMeters}m. Coupon: ${params.couponCode}. Time left: ${params.timeLeftMinutes} minutes.

Write ONE ad: a headline (very short, punchy) and a body (1-2 sentences). Weave in the trend (e.g. if trend says "PM loves pizza" and business is a pizza place, say something like "If the PM loves pizza, what about you? [DISTANCE] to the right – [COUPON_CODE] for 10% off, [TIME_LEFT] left.").
Output format, exactly:
HEADLINE: <headline text>
BODY: <body text with [DISTANCE] [TIME_LEFT] [COUPON_CODE] where values go>`;

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const { headline, body } = this.parseHeadlineBody(response);
    const trendContext = trendsList[0]?.title ?? null;

    const creative = await this.creativeRepo.create({
      campaignId: params.campaignId,
      headline: headline || 'Special offer',
      body: body || null,
      couponCode: params.couponCode,
      status: 'PENDING',
      trendContext,
    });

    return {
      id: creative.id,
      headline: creative.headline,
      body: creative.body,
      status: creative.status,
      trendContext: creative.trendContext,
    };
  }

  /**
   * Get creative content in the requested language. Caches in Redis: creative_{id}_{lang}.
   * Applies glossary for brand terms (e.g. "Happy Hour").
   */
  async getTranslated(creativeId: string, lang: string): Promise<TranslatedCreative | null> {
    const cacheKey = `${TRANSLATION_CACHE_PREFIX}${creativeId}_${lang}`;
    const client = this.getClient();
    if (client) {
      const cached = await client.get(cacheKey);
      if (cached) return JSON.parse(cached) as TranslatedCreative;
    }

    const creative = await this.creativeRepo.findById(creativeId);
    if (!creative) return null;

    if (lang === 'en' || lang === 'he' || lang === 'ar') {
      const translatedHeadline = applyGlossary(creative.headline, lang);
      const translatedBody = creative.body ? applyGlossary(creative.body, lang) : null;
      const result: TranslatedCreative = {
        headline: translatedHeadline,
        body: translatedBody,
        lang,
      };
      if (client) await client.setex(cacheKey, TRANSLATION_CACHE_TTL_SEC, JSON.stringify(result));
      return result;
    }

    // For other languages, use LLM to translate and apply glossary
    const glossaryTerms = getGlossaryTermsForPrompt().join(', ');
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Translate the following ad copy to language code "${lang}". Keep the same tone (short, punchy). Do NOT translate these terms, keep as-is: ${glossaryTerms}. Preserve any placeholders like [DISTANCE], [TIME_LEFT], [COUPON_CODE]. Output format: HEADLINE: <text> BODY: <text>`,
      },
      {
        role: 'user',
        content: `HEADLINE: ${creative.headline}\nBODY: ${creative.body ?? ''}`,
      },
    ]);
    const { headline, body } = this.parseHeadlineBody(response);
    const result: TranslatedCreative = {
      headline: headline ?? creative.headline,
      body: body ?? creative.body,
      lang,
    };
    if (client) await client.setex(cacheKey, TRANSLATION_CACHE_TTL_SEC, JSON.stringify(result));
    return result;
  }

  private formatTrendsForPrompt(trends: TrendItem[]): string {
    return trends.map((t, i) => `${i + 1}. ${t.title}${t.query ? ` (search: ${t.query})` : ''}`).join('\n');
  }

  private parseHeadlineBody(text: string): { headline: string; body: string | null } {
    let headline = '';
    let body: string | null = null;
    const lines = text.split('\n');
    for (const line of lines) {
      const hMatch = line.match(/^HEADLINE:\s*(.+)$/i);
      const bMatch = line.match(/^BODY:\s*(.+)$/i);
      if (hMatch) headline = hMatch[1].trim();
      if (bMatch) body = bMatch[1].trim();
    }
    return { headline, body };
  }
}
