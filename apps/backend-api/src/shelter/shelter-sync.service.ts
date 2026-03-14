import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShelterRepository } from './shelter.repository';
import { GisShelterClient } from './gis-shelter.client';

export type SyncResult =
  | { status: 'success'; upserted: number }
  | { status: 'skipped' }
  | { status: 'stale'; lastSync: Date | null; error: string };

@Injectable()
export class ShelterSyncService implements OnModuleInit {
  private readonly logger = new Logger(ShelterSyncService.name);
  private syncing = false;
  private lastSuccessfulSync: Date | null = null;

  constructor(
    private readonly repo: ShelterRepository,
    private readonly gisClient: GisShelterClient,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      this.logger.log('No shelters in DB – running initial sync');
      await this.sync();
    } else {
      this.logger.log(`Shelter table has ${count} rows – skipping initial sync`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    this.logger.log('Daily shelter sync triggered');
    await this.sync();
  }

  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      this.logger.warn('Sync already in progress – skipping');
      return { status: 'skipped' };
    }
    this.syncing = true;
    try {
      const shelters = await this.gisClient.fetchAll();
      const upserted = await this.repo.upsertMany(shelters);
      this.lastSuccessfulSync = new Date();
      this.logger.log(`Upserted ${upserted} shelters`);
      return { status: 'success', upserted };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ msg: 'GIS sync failed – existing data remains valid', error: message });
      return { status: 'stale', lastSync: this.lastSuccessfulSync, error: message };
    } finally {
      this.syncing = false;
    }
  }
}
