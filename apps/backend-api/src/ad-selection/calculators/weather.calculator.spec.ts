import { Test, TestingModule } from '@nestjs/testing';
import { WeatherCalculator } from './weather.calculator';
import type { TargetingPreferencesRecord } from '../interfaces/targeting-preferences.interface';

describe('WeatherCalculator', () => {
  let calculator: WeatherCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeatherCalculator],
    }).compile();
    calculator = module.get(WeatherCalculator);
  });

  it('returns 0 when prefs is undefined', () => {
    expect(calculator.score({ tempCelsius: 20, condition: 'Clear' }, undefined)).toBe(0);
  });

  it('adds 10 when temp >= minTemp', () => {
    const prefs: TargetingPreferencesRecord = {
      id: '1',
      businessId: 'b1',
      minTemp: 15,
      maxTemp: null,
      weatherCondition: null,
      proximityTriggers: null,
    };
    expect(calculator.score({ tempCelsius: 18, condition: 'Clear' }, prefs)).toBe(10);
    expect(calculator.score({ tempCelsius: 15, condition: 'Clear' }, prefs)).toBe(10);
    expect(calculator.score({ tempCelsius: 14, condition: 'Clear' }, prefs)).toBe(0);
  });

  it('adds 10 when temp <= maxTemp', () => {
    const prefs: TargetingPreferencesRecord = {
      id: '1',
      businessId: 'b1',
      minTemp: null,
      maxTemp: 25,
      weatherCondition: null,
      proximityTriggers: null,
    };
    expect(calculator.score({ tempCelsius: 20, condition: 'Clear' }, prefs)).toBe(10);
    expect(calculator.score({ tempCelsius: 25, condition: 'Clear' }, prefs)).toBe(10);
    expect(calculator.score({ tempCelsius: 26, condition: 'Clear' }, prefs)).toBe(0);
  });

  it('adds 15 when weatherCondition matches', () => {
    const prefs: TargetingPreferencesRecord = {
      id: '1',
      businessId: 'b1',
      minTemp: null,
      maxTemp: null,
      weatherCondition: 'Rain',
      proximityTriggers: null,
    };
    expect(calculator.score({ tempCelsius: 12, condition: 'Rain' }, prefs)).toBe(15);
    expect(calculator.score({ tempCelsius: 12, condition: 'rain' }, prefs)).toBe(15);
    expect(calculator.score({ tempCelsius: 12, condition: 'Drizzle' }, prefs)).toBe(0);
  });

  it('sums minTemp, maxTemp and weatherCondition when all match', () => {
    const prefs: TargetingPreferencesRecord = {
      id: '1',
      businessId: 'b1',
      minTemp: 10,
      maxTemp: 22,
      weatherCondition: 'Sun',
      proximityTriggers: null,
    };
    expect(calculator.score({ tempCelsius: 18, condition: 'Clear' }, prefs)).toBe(10 + 10 + 0);
    expect(calculator.score({ tempCelsius: 18, condition: 'Sunny' }, prefs)).toBe(10 + 10 + 15);
  });
});
