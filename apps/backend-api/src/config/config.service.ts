import { Injectable } from '@nestjs/common';
import type { EnvConfig } from './config.schema';

/**
 * Injected config: no process.env in application code.
 * Keys are those defined in envSchema (camelCase or UPPER_SNAKE).
 */
@Injectable()
export class ConfigService {
  constructor(private readonly env: EnvConfig) {}

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] | undefined {
    return this.env[key];
  }

  getOrThrow<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    const value = this.get(key);
    if (value === undefined || value === null) {
      throw new Error(`Config key ${String(key)} is required but missing`);
    }
    return value;
  }
}
