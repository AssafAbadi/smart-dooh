import type { PreferenceFilter } from '../constants/filter-tags';

export interface DriverPreferencesRecord {
  preference_tags: PreferenceFilter[];
  excludedLanguages: string[];
}

/** Partial update for driver preferences (only the fields that are set). */
export type DriverPreferencesUpdate = Partial<{
  preference_tags: PreferenceFilter[];
  excludedLanguages: string[];
}>;

/**
 * Data Access Layer: driver preferences by driver ID.
 */
export interface IDriverPreferencesRepository {
  getByDriverId(driverId: string): Promise<DriverPreferencesRecord | null>;
  upsert(driverId: string, update: DriverPreferencesUpdate): Promise<DriverPreferencesRecord>;
}
