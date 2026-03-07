import { Injectable } from '@nestjs/common';
import type { TargetingPreferencesRecord } from '../interfaces/targeting-preferences.interface';

/**
 * Returns score when current weather matches business targeting preferences.
 * Used by ContextRulesStrategy. Kept under 25 lines.
 */
@Injectable()
export class WeatherCalculator {
  score(
    weather: { tempCelsius: number; condition: string },
    prefs: TargetingPreferencesRecord | undefined
  ): number {
    if (!prefs) return 0;
    let match = 0;
    if (prefs.minTemp != null && weather.tempCelsius >= prefs.minTemp) match += 10;
    if (prefs.maxTemp != null && weather.tempCelsius <= prefs.maxTemp) match += 10;
    if (prefs.weatherCondition != null) {
      const cond = weather.condition.toLowerCase();
      const want = prefs.weatherCondition.toLowerCase();
      if (cond.includes(want) || want.includes(cond)) match += 15;
    }
    return match;
  }
}
