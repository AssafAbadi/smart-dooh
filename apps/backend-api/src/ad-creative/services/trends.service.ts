import { Injectable } from '@nestjs/common';
import { ExternalApiConfigService } from '../../config/external-api-keys.config';
import type { TrendItem, ITrendsService } from '../interfaces/trends.interface';

const TRENDS_CACHE_KEY_PREFIX = 'trends:';
const TRENDS_CACHE_TTL_SEC = 3600; // 1 hour

/**
 * Fetches trending topics for a region (e.g. Israel).
 * Uses SerpApi Google Trends when SERPAPI_API_KEY is set; otherwise returns mock trends for demo.
 */
@Injectable()
export class TrendsService implements ITrendsService {
  constructor(private readonly apiKeys: ExternalApiConfigService) {}

  async getTrendsForRegion(regionCode: string): Promise<TrendItem[]> {
    const apiKey = this.apiKeys.getSerpApiKey();
    if (apiKey) {
      try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.set('engine', 'google_trends');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('geo', regionCode);
        const res = await fetch(url.toString());
        if (!res.ok) return this.getMockTrends(regionCode);
        const data = (await res.json()) as {
          trending_searches?: Array<{ title?: string; query?: string }>;
          daily_searches?: Array<{ title?: string; query?: string }>;
        };
        const list =
          data.trending_searches ?? data.daily_searches ?? [];
        return list.slice(0, 15).map((t) => ({
          title: t.title ?? t.query ?? '',
          query: t.query,
        }));
      } catch {
        return this.getMockTrends(regionCode);
      }
    }
    return this.getMockTrends(regionCode);
  }

  private getMockTrends(regionCode: string): TrendItem[] {
    // Plausible trends so LLM can generate contextual ads (e.g. PM/pizza, viral food, etc.)
    const isIsrael = regionCode === 'IL' || regionCode.toLowerCase() === 'israel';
    if (isIsrael) {
      return [
        { title: 'Prime Minister praises local pizza in Tel Aviv', query: 'pizza Israel' },
        { title: 'Viral trend: politicians and pizza', query: 'politician pizza' },
        { title: 'Happy Hour deals trending in Israel', query: 'Happy Hour Israel' },
        { title: 'Coffee culture boom in Israel', query: 'coffee Israel' },
        { title: 'Local restaurant gets PM mention', query: 'restaurant Israel news' },
      ];
    }
    return [
      { title: 'Local food trend going viral', query: 'local food' },
      { title: 'Happy Hour searches up', query: 'Happy Hour' },
    ];
  }
}
