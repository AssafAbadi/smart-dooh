/** Targeting preferences per business (camelCase in code). */
export interface TargetingPreferencesRecord {
  id: string;
  businessId: string;
  minTemp: number | null;
  maxTemp: number | null;
  weatherCondition: string | null;
  proximityTriggers: string[] | null; // e.g. ['beach','gym','office_area']
}

export interface TargetingPreferencesUpsert {
  businessId: string;
  minTemp?: number | null;
  maxTemp?: number | null;
  weatherCondition?: string | null;
  proximityTriggers?: string[] | null;
}

export interface ITargetingPreferencesRepository {
  findByBusinessId(businessId: string): Promise<TargetingPreferencesRecord | null>;
  findByBusinessIds(businessIds: string[]): Promise<TargetingPreferencesRecord[]>;
  upsert(data: TargetingPreferencesUpsert): Promise<TargetingPreferencesRecord>;
}
