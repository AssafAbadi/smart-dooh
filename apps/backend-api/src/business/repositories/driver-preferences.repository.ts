import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PreferenceFilter as PrismaPreferenceFilter } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DriverPreferencesRecord,
  DriverPreferencesUpdate,
  IDriverPreferencesRepository,
} from '../../core/interfaces/driver-preferences-repository.interface';
import { isPreferenceFilter } from '../../core/constants/filter-tags';

@Injectable()
export class DriverPreferencesRepository implements IDriverPreferencesRepository {
  private readonly logger = new Logger(DriverPreferencesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getByDriverId(driverId: string): Promise<DriverPreferencesRecord | null> {
    const row = await this.prisma.driverPreferences.findUnique({
      where: { driverId },
    });
    this.logger.log({ driverId, found: !!row, msg: 'getByDriverId' });
    if (!row) return null;
    return this.toRecord(row);
  }

  async upsert(driverId: string, update: DriverPreferencesUpdate): Promise<DriverPreferencesRecord> {
    await this.prisma.driver.upsert({
      where: { id: driverId },
      create: { id: driverId },
      update: {},
    });
    const data = this.sanitize(update);
    const createPayload: Prisma.DriverPreferencesUncheckedCreateInput = {
      driverId,
      preference_tags: Array.isArray(data.preference_tags) ? data.preference_tags : [],
      excludedLanguages: Array.isArray(data.excludedLanguages) ? data.excludedLanguages : [],
    };
    const row = await this.prisma.driverPreferences.upsert({
      where: { driverId },
      create: createPayload,
      update: data,
    });
    this.logger.log({ driverId, preference_tags: row.preference_tags, msg: 'upsert' });
    return this.toRecord(row);
  }

  private toRecord(row: {
    preference_tags: unknown[];
    excludedLanguages: string[];
  }): DriverPreferencesRecord {
    const tags = (row.preference_tags ?? []).filter((t): t is import('../../core/constants/filter-tags').PreferenceFilter =>
      typeof t === 'string' && isPreferenceFilter(t)
    );
    return {
      preference_tags: tags,
      excludedLanguages: row.excludedLanguages,
    };
  }

  private sanitize(update: DriverPreferencesUpdate): Prisma.DriverPreferencesUncheckedUpdateInput {
    const out: Prisma.DriverPreferencesUncheckedUpdateInput = {};
    if (update.preference_tags !== undefined) {
      out.preference_tags = update.preference_tags.filter((t): t is typeof t => isPreferenceFilter(t)) as PrismaPreferenceFilter[];
    }
    if (update.excludedLanguages !== undefined) out.excludedLanguages = update.excludedLanguages;
    return out;
  }
}
