import { useCallback, useEffect, useState } from 'react';
import { getApiBase, apiHeaders } from '../services/apiClient';
import { logger } from '../utils/logger';

const API_BASE = getApiBase();

function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fetchEarnings(driverId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  const start = periodStart.toISOString();
  const end = periodEnd.toISOString();
  const url = `${API_BASE}/payments/driver-earnings/${encodeURIComponent(driverId)}?periodStart=${encodeURIComponent(start)}&periodEnd=${encodeURIComponent(end)}`;
  return fetch(url, { headers: apiHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`Earnings fetch failed: ${res.status}`);
      return res.json();
    })
    .then((data: { earningsILS: number }) => data.earningsILS);
}

/** Today's earnings (from start of local day to now). */
export function useDriverDailyEarnings(driverId: string | null) {
  const [earnings, setEarnings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    const start = getStartOfToday();
    const end = new Date();
    fetchEarnings(driverId, start, end)
      .then((v) => setEarnings(v))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        logger.error('Daily earnings fetch error', e);
      })
      .finally(() => setLoading(false));
  }, [driverId]);

  useEffect(() => {
    if (!driverId) {
      setEarnings(null);
      setLoading(false);
      return;
    }
    refetch();
  }, [driverId, refetch]);

  // Poll so today's balance updates after new impressions
  useEffect(() => {
    if (!driverId) return;
    const t = setInterval(() => {
      const start = getStartOfToday();
      const end = new Date();
      fetchEarnings(driverId, start, end)
        .then((v) => setEarnings(v))
        .catch((e) => logger.warn('Daily earnings poll failed', { driverId, err: e instanceof Error ? e.message : e }));
    }, 15000);
    return () => clearInterval(t);
  }, [driverId]);

  return { earnings, loading, error, refetch };
}

/** All-time total earnings (from epoch to now). */
export function useDriverTotalEarnings(driverId: string | null) {
  const [earnings, setEarnings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    const start = new Date(2020, 0, 1);
    const end = new Date();
    fetchEarnings(driverId, start, end)
      .then((v) => setEarnings(v))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load');
        logger.error('Total earnings fetch error', e);
      })
      .finally(() => setLoading(false));
  }, [driverId]);

  useEffect(() => {
    if (!driverId) {
      setEarnings(null);
      setLoading(false);
      return;
    }
    refetch();
  }, [driverId, refetch]);

  return { earnings, loading, error, refetch };
}
