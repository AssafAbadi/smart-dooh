import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  TargetingPreferencesRecord,
  TargetingPreferencesUpsert,
} from '../interfaces/targeting-preferences.interface';

function mapJsonToTriggers(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value) && value.every((x) => typeof x === 'string')) return value;
  if (Array.isArray(value)) return value.map(String);
  return null;
}

@Injectable()
export class TargetingPreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBusinessId(businessId: string): Promise<TargetingPreferencesRecord | null> {
    const row = await this.prisma.targetingPreferences.findUnique({
      where: { businessId },
    });
    return row ? toRecord(row) : null;
  }

  async findByBusinessIds(businessIds: string[]): Promise<TargetingPreferencesRecord[]> {
    if (businessIds.length === 0) return [];
    const rows = await this.prisma.targetingPreferences.findMany({
      where: { businessId: { in: businessIds } },
    });
    return rows.map(toRecord);
  }

  async upsert(data: TargetingPreferencesUpsert): Promise<TargetingPreferencesRecord> {
    const row = await this.prisma.targetingPreferences.upsert({
      where: { businessId: data.businessId },
      create: {
        businessId: data.businessId,
        minTemp: data.minTemp ?? undefined,
        maxTemp: data.maxTemp ?? undefined,
        weatherCondition: data.weatherCondition ?? undefined,
        proximityTriggers: data.proximityTriggers ?? undefined,
      },
      update: {
        minTemp: data.minTemp ?? undefined,
        maxTemp: data.maxTemp ?? undefined,
        weatherCondition: data.weatherCondition ?? undefined,
        proximityTriggers: data.proximityTriggers ?? undefined,
      },
    });
    return toRecord(row);
  }
}

function toRecord(row: {
  id: string;
  businessId: string;
  minTemp: number | null;
  maxTemp: number | null;
  weatherCondition: string | null;
  proximityTriggers: unknown;
}): TargetingPreferencesRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    minTemp: row.minTemp,
    maxTemp: row.maxTemp,
    weatherCondition: row.weatherCondition,
    proximityTriggers: mapJsonToTriggers(row.proximityTriggers),
  };
}
