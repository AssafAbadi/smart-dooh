import type { QueuedImpression } from '../stores/offlineQueueStore';
import { apiHeaders } from './apiClient';

/**
 * Sync queued impressions with exponential backoff. Reuse client_uuid for idempotency.
 */
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export async function syncWithBackoff(
  queue: { client_uuid: string; [k: string]: unknown }[],
  send: (item: (typeof queue)[0]) => Promise<void>
): Promise<{ synced: string[]; failed: string[] }> {
  const synced: string[] = [];
  const failed: string[] = [];
  let delay = BASE_DELAY_MS;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    for (const item of queue) {
      if (synced.includes(item.client_uuid)) continue;
      try {
        await send(item);
        synced.push(item.client_uuid);
      } catch {
        failed.push(item.client_uuid);
      }
    }
    if (failed.length === 0) break;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 30000);
  }
  return { synced, failed };
}

/**
 * Returns a send function that POSTs one impression to the backend.
 * Used when syncing the offline queue so driver balance updates.
 */
export function createImpressionSender(apiBase: string): (item: QueuedImpression) => Promise<void> {
  return async (item: QueuedImpression) => {
    const res = await fetch(`${apiBase}/impressions`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        client_uuid: item.client_uuid,
        campaignId: item.campaignId,
        creativeId: item.creativeId,
        deviceId: item.deviceId,
        driverId: item.driverId ?? undefined,
        lat: item.lat,
        lng: item.lng,
        geohash: item.geohash,
      }),
    });
    if (!res.ok) {
      throw new Error(`Impressions ${res.status}`);
    }
  };
}
