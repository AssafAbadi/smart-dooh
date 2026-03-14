import { Injectable, Logger } from '@nestjs/common';
import type { SelectionContext } from '../interfaces/ad-selection.interface';

export interface RelevanceInput {
  distanceMeters: number;
  context: SelectionContext;
  headline?: string;
  body?: string;
}

@Injectable()
export class RelevanceCalculator {
  private readonly logger = new Logger(RelevanceCalculator.name);

  compute(input: RelevanceInput): number {
    const proximity = this.proximityScore(input.distanceMeters);
    const time = this.timeRelevance(input.context.timeHour, input.headline, input.body);
    const weather = this.weatherRelevance(input.context.weather, input.headline, input.body);
    return proximity * time * weather;
  }

  proximityScore(distanceMeters: number): number {
    if (distanceMeters < 50) return 1.5;
    if (distanceMeters < 200) return 1.2;
    if (distanceMeters < 500) return 1.0;
    if (distanceMeters < 1000) return 0.7;
    return 0.5;
  }

  timeRelevance(hour: number, headline?: string, body?: string): number {
    const text = `${(headline ?? '').toLowerCase()} ${(body ?? '').toLowerCase()}`;
    let relevance = 1.0;
    if (hour >= 11 && hour <= 14 && /lunch|צהריים|restaurant|food/.test(text)) relevance = 1.3;
    else if (hour >= 17 && hour <= 19 && /happy hour|הנחה|bar|drink/.test(text)) relevance = 1.4;
    else if (hour >= 6 && hour <= 9 && /coffee|breakfast|בוקר/.test(text)) relevance = 1.3;
    else if (hour >= 20 && /dinner|ערב|steak|night/.test(text)) relevance = 1.2;
    return Math.max(0.5, Math.min(1.5, relevance));
  }

  weatherRelevance(
    weather: { tempCelsius: number; condition: string } | null,
    headline?: string,
    body?: string,
  ): number {
    if (!weather) return 1.0;
    const text = `${(headline ?? '').toLowerCase()} ${(body ?? '').toLowerCase()}`;
    let relevance = 1.0;
    const isRainy = /rain/i.test(weather.condition);
    const isCold = weather.tempCelsius < 15;
    const isHot = weather.tempCelsius > 28;

    if (isCold && /hot|soup|coffee|tea|חם/.test(text)) relevance += 0.15;
    if (isHot && /cold|ice|drink|קר/.test(text)) relevance += 0.15;
    if (isRainy && /indoor|delivery|משלוח/.test(text)) relevance += 0.1;
    return Math.max(0.8, Math.min(1.2, relevance));
  }
}
