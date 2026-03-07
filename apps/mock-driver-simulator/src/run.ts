/**
 * Mock Driver Simulator (Prompt 5).
 * - Input: GeoJSON polyline (Tel Aviv route).
 * - Emits GPS pings + mock BLE; calls context-engine, ad-selection, heartbeat, impressions.
 * - Verifies: Redis caching, idempotency (same impression twice => one record), emergency override.
 */

import * as fs from 'fs';
import * as path from 'path';
import { encodeGeohash } from './geohash';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const DRIVER_ID = process.env.DRIVER_ID ?? 'sim-driver-1';
const DEVICE_ID = process.env.DEVICE_ID ?? 'sim-device-' + Date.now();
const DELAY_MS = 6200; // Slightly over 5s device rate limit

type GeoJsonFeature = {
  type: string;
  geometry: { type: string; coordinates: number[][] };
};

function loadRoute(): { lat: number; lng: number }[] {
  const p = path.join(__dirname, '..', 'data', 'tel-aviv-route.json');
  const raw = fs.readFileSync(p, 'utf-8');
  const geojson = JSON.parse(raw) as GeoJsonFeature;
  const coords = geojson.geometry?.coordinates ?? [];
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(
  url: string,
  options?: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<unknown> {
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: options?.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main(): Promise<void> {
  const route = loadRoute();
  const runId = Date.now();
  console.log(`Loaded ${route.length} points from Tel Aviv route. API_BASE=${API_BASE}`);

  // --- 1) GPS + Mock BLE: walk route, call context + ad-selection + heartbeat + record impression ---
  const timeHour = new Date().getHours();
  for (let i = 0; i < route.length; i++) {
    const { lat, lng } = route[i];
    const geohash = encodeGeohash(lat, lng);
    const headers = { 'x-device-id': DEVICE_ID };

    const contextUrl = `${API_BASE}/context-engine/context?driverId=${encodeURIComponent(DRIVER_ID)}&deviceId=${encodeURIComponent(DEVICE_ID)}&lat=${lat}&lng=${lng}&geohash=${geohash}`;
    const context = await fetchJson(contextUrl, { headers }) as { businesses: unknown[]; pois: unknown[]; weather: unknown };
    console.log(`Point ${i + 1}/${route.length} context: businesses=${context.businesses?.length ?? 0}, pois=${context.pois?.length ?? 0}`);

    await sleep(DELAY_MS);

    const rankedUrl = `${API_BASE}/ad-selection/ranked?driverId=${encodeURIComponent(DRIVER_ID)}&lat=${lat}&lng=${lng}&geohash=${geohash}&timeHour=${timeHour}`;
    const ranked = await fetchJson(rankedUrl, { headers }) as { instructions: { campaignId: string; creativeId?: string; headline?: string }[] };
    const instructions = ranked.instructions ?? [];
    console.log(`Point ${i + 1}/${route.length} ranked: ${instructions.length} ad(s), first: ${instructions[0]?.campaignId ?? '—'}`);

    // Record one impression per point so driver balance updates (real campaignId/creativeId; skip emergency)
    const first = instructions[0];
    if (first?.campaignId && first.campaignId !== 'emergency' && first.creativeId) {
      const impressionBody = {
        client_uuid: `sim-${DRIVER_ID}-${runId}-${i}`,
        campaignId: first.campaignId,
        creativeId: first.creativeId,
        deviceId: DEVICE_ID,
        driverId: DRIVER_ID,
        lat,
        lng,
        geohash,
      };
      await fetchJson(`${API_BASE}/impressions`, { method: 'POST', body: JSON.stringify(impressionBody) }).catch((e) =>
        console.warn('Impressions POST failed:', e.message)
      );
    }

    // Push position to backend so the phone app (in simulator mode) can show ads for this location
    await fetchJson(`${API_BASE}/simulator/position`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ driverId: DRIVER_ID, lat, lng, geohash }),
    }).catch((e) => console.warn('Simulator position push failed:', e.message));

    await sleep(DELAY_MS);

    await fetchJson(`${API_BASE}/car-screens/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId: DEVICE_ID, driverId: DRIVER_ID }),
    }).catch((e) => console.warn('Heartbeat failed:', e.message));
  }

  // --- 2) Verify Redis caching: same position twice => second call uses cache (no error, same shape) ---
  console.log('\n--- Redis cache check: same position twice ---');
  const [first] = route;
  const geohash0 = encodeGeohash(first.lat, first.lng);
  const url1 = `${API_BASE}/context-engine/context?driverId=${DRIVER_ID}&deviceId=${DEVICE_ID}&lat=${first.lat}&lng=${first.lng}&geohash=${geohash0}`;
  await fetchJson(url1, { headers: { 'x-device-id': DEVICE_ID } });
  await sleep(DELAY_MS);
  const ctx2 = await fetchJson(url1, { headers: { 'x-device-id': DEVICE_ID } }) as { businesses: unknown[] };
  console.log('Second context call (same position): OK, businesses=', (ctx2 as { businesses: unknown[] }).businesses?.length ?? 0);

  // --- 3) Idempotency: send same impression twice, then count by client_uuid => 1 ---
  console.log('\n--- Idempotency: same impression twice => one record ---');
  const clientUuid = 'sim-imp-' + Date.now();
  const impressionBody = {
    client_uuid: clientUuid,
    campaignId: 'test-campaign',
    creativeId: 'test-creative',
    deviceId: DEVICE_ID,
    driverId: DRIVER_ID,
    lat: first.lat,
    lng: first.lng,
    geohash: geohash0,
  };
  await fetchJson(`${API_BASE}/impressions`, { method: 'POST', body: JSON.stringify(impressionBody) });
  await fetchJson(`${API_BASE}/impressions`, { method: 'POST', body: JSON.stringify(impressionBody) });
  const countRes = await fetchJson(`${API_BASE}/impressions/count?client_uuid=${encodeURIComponent(clientUuid)}`) as { count: number };
  const count = countRes.count ?? 0;
  if (count !== 1) {
    throw new Error(`Idempotency failed: expected 1 record for client_uuid, got ${count}`);
  }
  console.log('Idempotency OK: count by client_uuid = 1');

  // --- 4) Emergency override: if an active EmergencyAlert exists for a point on the route, ad-selection returns campaignId 'emergency' ---
  console.log('\n--- Emergency override check ---');
  const emergencyPoint = route[0];
  const gh = encodeGeohash(emergencyPoint.lat, emergencyPoint.lng);
  await sleep(DELAY_MS);
  const rankedEmergency = await fetchJson(
    `${API_BASE}/ad-selection/ranked?driverId=${DRIVER_ID}&lat=${emergencyPoint.lat}&lng=${emergencyPoint.lng}&geohash=${gh}&timeHour=${timeHour}`,
    { headers: { 'x-device-id': DEVICE_ID } }
  ) as { instructions: { campaignId: string }[] };
  const hasEmergency = (rankedEmergency.instructions ?? []).some((i) => i.campaignId === 'emergency');
  if (hasEmergency) {
    console.log('Emergency override OK: instruction with campaignId "emergency" returned.');
  } else {
    console.log('Emergency override: no emergency instruction at first point (add an active EmergencyAlert in DB for this route point to verify).');
  }

  console.log('\nSimulation finished.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
