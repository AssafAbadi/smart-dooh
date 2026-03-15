import { io, Socket } from 'socket.io-client';
import { getApiBase } from './apiClient';
import { useEmergencyStore } from '../stores/emergencyStore';
import { useAdStore } from '../stores/adStore';
import { logger } from '../utils/logger';
import { emergencyDataSchema, emergencyCheckResultSchema } from '@smart-dooh/shared-dto';

const API_BASE = getApiBase();
const FALLBACK_POLL_INTERVAL_MS = 2000;
const DISCONNECT_THRESHOLD_MS = 3000;
/** Ignore new ALERT_ACTIVE for this long after an alert was set to avoid flicker and redundant navigation. */
const ALERT_THROTTLE_MS = 60_000;

let socket: Socket | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
let lastDisconnectTime: number | null = null;

// Module-level position ref – avoids stale closures in fallback polling
const currentPosition = { lat: 0, lng: 0 };

function handleAlertActive(data: unknown): void {
  const parsed = emergencyDataSchema.safeParse(data);
  if (!parsed.success) {
    logger.warn('Invalid ALERT_ACTIVE payload received', { errors: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const store = useEmergencyStore.getState();
  if (store.isAlertActive && store.alertTimestamp != null && Date.now() - store.alertTimestamp < ALERT_THROTTLE_MS) {
    logger.debug('ALERT_ACTIVE throttled (within 60s of last alert)');
    return;
  }
  logger.warn('ALERT_ACTIVE received via socket', { shelter: d.shelterAddress });
  store.setAlert(
    {
      address: d.shelterAddress,
      lat: d.shelterLat,
      lng: d.shelterLng,
      distanceMeters: d.distanceMeters,
      bearingDegrees: d.bearingDegrees,
      direction: d.direction,
    },
    d.alertHeadline,
  );
}

function handleAlertClear(): void {
  logger.info('ALERT_CLEAR received via socket');
  useEmergencyStore.getState().clearAlert();
  const adStore = useAdStore.getState();
  const first = adStore.instructions[0];
  if (first?.campaignId === 'emergency' || first?.emergencyData) {
    adStore.clear();
    adStore.requestRefresh();
    logger.info('Cleared emergency ad slot and requested ranked refresh');
  }
}

export function connectSocket(driverId: string, lat: number, lng: number): void {
  currentPosition.lat = lat;
  currentPosition.lng = lng;

  if (socket?.connected) {
    socket.emit('updatePosition', { lat, lng });
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const url = API_BASE.replace(/\/$/, '') + '/emergency';
  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    logger.info('Emergency socket connected');
    lastDisconnectTime = null;
    socket?.emit('register', { driverId, lat: currentPosition.lat, lng: currentPosition.lng });
    stopFallbackPolling();
  });

  socket.on('disconnect', () => {
    logger.warn('Emergency socket disconnected');
    lastDisconnectTime = Date.now();
    startFallbackPolling();
  });

  socket.on('ALERT_ACTIVE', handleAlertActive);
  socket.on('ALERT_CLEAR', handleAlertClear);

  socket.on('connect_error', (err) => {
    logger.debug(`Socket connect error: ${err.message}`);
  });
}

export function updateSocketPosition(lat: number, lng: number): void {
  currentPosition.lat = lat;
  currentPosition.lng = lng;
  if (socket?.connected) {
    socket.emit('updatePosition', { lat, lng });
  }
}

export function disconnectSocket(): void {
  stopFallbackPolling();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

function startFallbackPolling(): void {
  if (fallbackInterval) return;

  fallbackInterval = setInterval(async () => {
    if (socket?.connected) {
      stopFallbackPolling();
      return;
    }

    if (lastDisconnectTime && Date.now() - lastDisconnectTime < DISCONNECT_THRESHOLD_MS) {
      return;
    }

    try {
      const { lat, lng } = currentPosition;
      const response = await fetch(`${API_BASE}/emergency/check?lat=${lat}&lng=${lng}`);
      if (!response.ok) return;
      const raw = await response.json();

      const parsed = emergencyCheckResultSchema.safeParse(raw);
      if (!parsed.success) return;

      const data = parsed.data;
      const store = useEmergencyStore.getState();

      if (data.active && data.shelter) {
        const withinThrottle = store.isAlertActive && store.alertTimestamp != null && Date.now() - store.alertTimestamp < ALERT_THROTTLE_MS;
        if (withinThrottle) return;
        store.setAlert(
          {
            address: data.shelter.address,
            lat: data.shelter.lat,
            lng: data.shelter.lng,
            distanceMeters: data.shelter.distanceMeters,
            bearingDegrees: data.shelter.bearingDegrees,
            direction: data.shelter.direction,
          },
          data.alert.headline,
        );
      } else if (!data.active && store.isAlertActive) {
        store.clearAlert();
      }
    } catch {
      // network error during emergency – keep showing cached shelter
    }
  }, FALLBACK_POLL_INTERVAL_MS);
}

function stopFallbackPolling(): void {
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
}
