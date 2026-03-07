import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBase, apiHeaders } from '../services/apiClient';
import { logger } from '../utils/logger';

const API_BASE = getApiBase();
const BALANCE_POLL_INTERVAL_MS = 15000;

function fetchBalance(driverId: string): Promise<number> {
  const url = `${API_BASE}/payments/driver/${encodeURIComponent(driverId)}/balance`;
  return fetch(url, { headers: apiHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
      return res.json();
    })
    .then((data: { balance: number }) => {
      logger.info('Balance fetched', { driverId, balance: data.balance });
      return data.balance;
    });
}

export function useDriverBalance(driverId: string | null) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverIdRef = useRef(driverId);

  const loadBalance = useCallback((id: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    fetchBalance(id)
      .then((b) => setBalance(b))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load balance';
        setError(msg);
        logger.error('Balance fetch error', e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    driverIdRef.current = driverId;
    if (!driverId) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBalance(driverId)
      .then((b) => {
        if (!cancelled) setBalance(b);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load balance');
          logger.error('Balance fetch error', e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  // Poll so balance updates after simulator/impressions (e.g. every 15s)
  useEffect(() => {
    if (!driverId) return;
    const t = setInterval(() => {
      fetchBalance(driverId)
        .then((b) => setBalance(b))
        .catch((e) => logger.warn('Balance poll failed', { driverId, err: e instanceof Error ? e.message : e }));
    }, BALANCE_POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [driverId]);

  const refetch = useCallback(() => {
    if (driverId) {
      logger.info('Balance refetch requested', { driverId });
      loadBalance(driverId);
    }
  }, [driverId, loadBalance]);

  return { balance, loading, error, refetch };
}
