import type { BusinessTag, PreferenceFilter } from '../constants/filter-tags';

/**
 * Business entity shape used by DAL.
 * Filtering: rule-based per driver preference (restaurant-gated for dietary/kosher/alcohol).
 */
export interface BusinessFilter {
  preference_tags?: PreferenceFilter[];
  excludedLanguages?: string[];
}

export interface BusinessRecord {
  id: string;
  name: string;
  tags: BusinessTag[];
  language: string | null;
}

/**
 * Data Access Layer: businesses filtered by driver preferences (kosher, alcohol, language, category).
 */
export interface IBusinessRepository {
  findFiltered(filter: BusinessFilter): Promise<BusinessRecord[]>;
}
