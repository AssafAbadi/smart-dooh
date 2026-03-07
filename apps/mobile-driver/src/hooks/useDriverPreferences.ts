import { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { useAdStore } from '../stores/adStore';

import { getApiBase, apiHeaders } from '../services/apiClient';

const API_BASE = getApiBase();

/** Preference filters supported by the API (must match backend PreferenceFilter enum). */
const PREFERENCE_FILTERS = ['NO_ALCOHOL', 'KOSHER_ONLY', 'UNKOSHER_ONLY', 'VEGAN_ONLY', 'VEGETARIAN_ONLY', 'NO_GAMBLING'] as const;
export type PreferenceFilter = (typeof PREFERENCE_FILTERS)[number];

const FILTER_TO_KEY: Record<PreferenceFilter, keyof DriverPreferences> = {
  NO_ALCOHOL: 'pref_noAlcohol',
  KOSHER_ONLY: 'pref_kosherOnly',
  UNKOSHER_ONLY: 'pref_unkosherOnly',
  VEGAN_ONLY: 'pref_veganOnly',
  VEGETARIAN_ONLY: 'pref_vegetarianOnly',
  NO_GAMBLING: 'pref_noGambling',
};

/** UI state: one boolean per filter (maps to/from API preference_tags). */
export interface DriverPreferences {
  pref_veganOnly: boolean;
  pref_vegetarianOnly: boolean;
  pref_kosherOnly: boolean;
  pref_noAlcohol: boolean;
  pref_noGambling: boolean;
  pref_unkosherOnly: boolean;
}

const defaults: DriverPreferences = {
  pref_veganOnly: false,
  pref_vegetarianOnly: false,
  pref_kosherOnly: false,
  pref_noAlcohol: false,
  pref_noGambling: false,
  pref_unkosherOnly: false,
};

function preferenceTagsToPrefs(preference_tags: string[]): DriverPreferences {
  const prefs = { ...defaults };
  for (const tag of preference_tags) {
    if (tag in FILTER_TO_KEY) {
      (prefs as Record<string, boolean>)[FILTER_TO_KEY[tag as PreferenceFilter]] = true;
    }
  }
  return prefs;
}

function prefsToPreferenceTags(prefs: DriverPreferences): PreferenceFilter[] {
  const tags: PreferenceFilter[] = [];
  for (const tag of PREFERENCE_FILTERS) {
    if (prefs[FILTER_TO_KEY[tag]]) tags.push(tag);
  }
  return tags;
}

const BOTH_DRIVER_IDS = ['driver-1', 'sim-driver-1'] as const;

export interface ApiDriverPreferences {
  preference_tags: string[];
  excludedLanguages: string[];
}

export function useDriverPreferences(driverId: string, options?: { syncToBothDrivers?: boolean }) {
  const syncToBoth = options?.syncToBothDrivers ?? false;
  const requestRefresh = useAdStore((s) => s.requestRefresh);
  const [preferences, setPreferences] = useState<DriverPreferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPrefs = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/context-engine/driver-preferences/${encodeURIComponent(driverId)}`, { headers: apiHeaders() });
      if (!res.ok) logger.warn('Driver preferences fetch failed', { status: res.status, driverId });
      const data = (await res.json()) as { preferences: ApiDriverPreferences };
      const p = data.preferences;
      const tags = p?.preference_tags ?? [];
      setPreferences(preferenceTagsToPrefs(tags));
      logger.info('Driver preferences loaded', { driverId, preference_tags: tags });
    } catch (e) {
      logger.error('Driver preferences fetch error', e);
      setPreferences(defaults);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePref = useCallback(
    async (key: keyof DriverPreferences, value: boolean) => {
      const next = { ...preferences, [key]: value };
      setSaveError(null);
      setPreferences(next);
      setSaving(true);
      try {
        const preference_tags = prefsToPreferenceTags(next);
        const body: ApiDriverPreferences = {
          preference_tags: Array.isArray(preference_tags) ? [...preference_tags] : [],
          excludedLanguages: [],
        };
        const bodyStr = JSON.stringify(body);
        logger.info('Driver preferences save payload', {
          typeof_preference_tags: typeof body.preference_tags,
          Array_isArray: Array.isArray(body.preference_tags),
          preference_tags: body.preference_tags,
          bodyStrLength: bodyStr.length,
          bodyStrPreview: bodyStr.slice(0, 120),
        });
        const ids = syncToBoth ? BOTH_DRIVER_IDS : [driverId];
        const results = await Promise.all(
          ids.map(async (id) => {
            const url = `${API_BASE}/context-engine/driver-preferences/${encodeURIComponent(id)}`;
            const opts = {
              headers: apiHeaders({ 'Content-Type': 'application/json' }),
              body: bodyStr,
            };
            let res = await fetch(url, { ...opts, method: 'PATCH' });
            if (res.status === 404) {
              res = await fetch(url, { ...opts, method: 'POST' });
            }
            return res;
          })
        );
        const failed = results.find((r) => !r.ok);
        if (failed) {
          const text = await failed.text();
          logger.error('Driver preferences save failed', { status: failed.status, body: text });
          throw new Error(`Save failed: ${failed.status} ${text}`);
        }
        logger.info('Driver preferences saved', { driverIds: ids, preference_tags: body.preference_tags });
        requestRefresh(); // refresh ads immediately so filter takes effect
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Save failed';
        logger.error('Driver preferences save error', e);
        setSaveError(msg);
      } finally {
        setSaving(false);
      }
    },
    [driverId, preferences, syncToBoth]
  );

  return { preferences, loading, saving, saveError, updatePref, refetch: fetchPrefs };
}
