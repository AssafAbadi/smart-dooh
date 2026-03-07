/**
 * Injection tokens for interface-based DI (enables testing and swapping implementations).
 */
export const TOKENS = {
  IRedisService: Symbol('IRedisService'),
  IContextSnapshotRepository: Symbol('IContextSnapshotRepository'),
  IHealthChecker: Symbol('IHealthChecker'),
  IBusinessRepository: Symbol('IBusinessRepository'),
  IDriverPreferencesRepository: Symbol('IDriverPreferencesRepository'),
  IRateLimitService: Symbol('IRateLimitService'),
  ICarScreenRepository: Symbol('ICarScreenRepository'),
  IEmergencyAlertRepository: Symbol('IEmergencyAlertRepository'),
} as const;
