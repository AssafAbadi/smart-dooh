import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import type { IAlertProvider } from './interfaces/alert-provider.interface';
import { ALERT_PROVIDERS_TOKEN } from './interfaces/alert-provider.interface';
import type { ActiveAlert } from './interfaces/pikud-haoref.interface';

@Injectable()
export class AlertProviderRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertProviderRegistry.name);

  constructor(
    @Inject(ALERT_PROVIDERS_TOKEN)
    @Optional()
    private readonly providers: IAlertProvider[] = [],
  ) {}

  onModuleInit(): void {
    for (const provider of this.providers) {
      this.logger.log(`Starting alert provider: ${provider.name}`);
      provider.start();
    }
  }

  onModuleDestroy(): void {
    for (const provider of this.providers) {
      this.logger.log(`Stopping alert provider: ${provider.name}`);
      provider.stop();
    }
  }

  /**
   * Returns all currently active alerts from all registered providers.
   * Each provider contributes at most one active alert.
   */
  getCurrentAlerts(): ActiveAlert[] {
    return this.providers
      .map((p) => p.getCurrentAlert())
      .filter((a): a is ActiveAlert => a !== null);
  }

  /** Returns the first active alert across all providers (highest priority / earliest triggered). */
  getPrimaryAlert(): ActiveAlert | null {
    return this.getCurrentAlerts()[0] ?? null;
  }

  get providerCount(): number {
    return this.providers.length;
  }
}
