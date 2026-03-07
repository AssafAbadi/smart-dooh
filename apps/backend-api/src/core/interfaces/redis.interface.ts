/**
 * Abstraction for Redis (DAL/infra). Allows swapping implementation and testing.
 */
export interface IRedisService {
  ping(): Promise<boolean>;
  getClient(): unknown;
}
