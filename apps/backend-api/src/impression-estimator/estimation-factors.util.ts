/**
 * Pure functions for impression reach estimation (Israeli time bands and speed factor).
 * Easy to unit-test without mocks.
 */

/**
 * Israeli time bands:
 * - Thu/Fri/Sat 21:00–02:00 → 1.6
 * - Sun–Thu 07:30–09:30 → 1.4 (hour >= 7 && (hour < 9 || (hour === 9 && minute <= 30)))
 * - "standard nights" (e.g. Sun–Wed 22–06) → 0.3
 * - else → 1.0
 */
export function getTimeMultiplier(dayOfWeek: number, hour: number, minute?: number): number {
  const m = minute ?? 0;
  const isThu = dayOfWeek === 4;
  const isFri = dayOfWeek === 5;
  const isSat = dayOfWeek === 6;
  const isWeekendNight = (isThu || isFri || isSat) && (hour >= 21 || hour <= 2);
  if (isWeekendNight) return 1.6;

  const isSunToThu = dayOfWeek >= 0 && dayOfWeek <= 4;
  const isMorningRush =
    isSunToThu && (hour >= 7 && (hour < 9 || (hour === 9 && m <= 30)));
  if (isMorningRush) return 1.4;

  const isNight = hour >= 22 || hour <= 6;
  if (isNight && !isWeekendNight) return 0.3;

  return 1.0;
}

/**
 * Speed factor:
 * - speed 0 and dwell > 10s → 2.0
 * - speed > 70 km/h → 0.1
 * - else → 1.0
 */
export function getSpeedFactor(speedKmh: number | undefined, dwellSeconds: number | undefined): number {
  if (speedKmh !== undefined && speedKmh !== null) {
    if (speedKmh > 70) return 0.1;
    if (speedKmh === 0 && dwellSeconds !== undefined && dwellSeconds !== null && dwellSeconds > 10) return 2.0;
  }
  return 1.0;
}
