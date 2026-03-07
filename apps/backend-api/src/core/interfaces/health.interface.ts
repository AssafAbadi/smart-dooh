/**
 * Readiness checks (Redis, DB, etc.). Used by HealthService (BL).
 */
export interface IHealthChecker {
  isReady(): Promise<boolean>;
  name(): string;
}
