import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getAuthTokenKey } from '../services/apiClient';
import { decodeJwtPayload } from '../services/authHelpers';

export function useAuthDriverId(): string | null {
  const [driverId, setDriverId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(getAuthTokenKey()).then((token) => {
      if (cancelled) return;
      const payload = token ? decodeJwtPayload(token) : null;
      setDriverId(payload?.driverId ?? null);
    });
    return () => { cancelled = true; };
  }, []);
  return driverId;
}
