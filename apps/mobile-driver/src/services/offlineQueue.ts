import { MMKV } from 'react-native-mmkv';
import type { QueuedImpression } from '../stores/offlineQueueStore';

const storage = new MMKV({ id: 'adrive-offline-queue' });
const KEY_QUEUE = 'impression_queue';
const KEY_CLIENT_UUID = 'client_uuid';

export function getStoredClientUuid(): string | null {
  return storage.getString(KEY_CLIENT_UUID) ?? null;
}

export function setStoredClientUuid(uuid: string): void {
  storage.set(KEY_CLIENT_UUID, uuid);
}

export function getStoredQueue(): QueuedImpression[] {
  try {
    const raw = storage.getString(KEY_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedImpression[]): void {
  storage.set(KEY_QUEUE, JSON.stringify(queue));
}

export function clearStoredQueue(): void {
  storage.delete(KEY_QUEUE);
}
