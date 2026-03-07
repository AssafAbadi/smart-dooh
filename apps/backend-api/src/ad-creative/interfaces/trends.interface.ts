/**
 * Trend item for a region (e.g. from Google Trends / SerpApi or mock).
 * Used to generate contextual ads (e.g. "PM loves pizza" → nearby pizza place ad).
 */
export interface TrendItem {
  title: string;
  query?: string;
  snippet?: string;
}

export interface ITrendsService {
  getTrendsForRegion(regionCode: string): Promise<TrendItem[]>;
}
