/**
 * Seed TrafficDensity table. Run after main seed: npm run seed:density
 * Uses geohash level 7 for all rows. Loads from prisma/data/tel-aviv-density.json if present;
 * always seeds 5 Tel Aviv hotspots (Azrieli, Rothschild, Dizengoff, Sarona, Namir) with peak density.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const LOG_PREFIX = '[seed-density]';
const prisma = new PrismaClient();

const GEOHASH_LEVEL = 7;
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat: number, lng: number, precision: number = GEOHASH_LEVEL): string {
  const bits = precision * 5;
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  const binary: number[] = [];
  for (let i = 0; i < bits; i++) {
    if (i % 2 === 0) {
      const mid = (lngMin + lngMax) / 2;
      binary.push(lng >= mid ? 1 : 0);
      lng >= mid ? (lngMin = mid) : (lngMax = mid);
    } else {
      const mid = (latMin + latMax) / 2;
      binary.push(lat >= mid ? 1 : 0);
      lat >= mid ? (latMin = mid) : (latMax = mid);
    }
  }
  let hash = '';
  for (let i = 0; i < binary.length; i += 5) {
    let idx = 0;
    for (let j = 0; j < 5 && i + j < binary.length; j++) idx = (idx << 1) | binary[i + j];
    hash += BASE32[idx];
  }
  return hash;
}

function toGeohash7(geohash: string): string {
  return geohash.slice(0, GEOHASH_LEVEL);
}

/** Hotspots in Tel Aviv with reference coordinates (lat, lng) and peak baseDensity for testing. */
const HOTSPOTS: { name: string; lat: number; lng: number; peakDensity: number }[] = [
  { name: 'Azrieli', lat: 32.0745, lng: 34.7918, peakDensity: 95 },
  { name: 'Rothschild', lat: 32.0642, lng: 34.7718, peakDensity: 90 },
  { name: 'Dizengoff', lat: 32.0775, lng: 34.7755, peakDensity: 88 },
  { name: 'Sarona', lat: 32.0735, lng: 34.7875, peakDensity: 85 },
  { name: 'Namir', lat: 32.087, lng: 34.781, peakDensity: 82 },
];

/** Time slots to seed per hotspot: Thu/Fri/Sat evening (21, 22, 23) and Sun-Thu rush (7, 8). */
const PEAK_HOURS = [7, 8, 21, 22, 23];
const PEAK_DAYS = [4, 5, 6]; // Thu, Fri, Sat for evening; for rush use 0-4 (Sun-Thu)
/** When no peak: use this so revenue still varies by location instead of falling back to default 10. */
const OFF_PEAK_DENSITY = 25;

/**
 * Tel Aviv simulator route points (lat, lng) with location-based density:
 * Rothschild start → quieter middle → busier toward end. Same order as tel-aviv-route.json.
 */
const ROUTE_POINTS: { lat: number; lng: number; baseDensity: number }[] = [
  { lat: 32.0642, lng: 34.7718, baseDensity: 90 },  // Rothschild
  { lat: 32.065, lng: 34.7728, baseDensity: 68 },
  { lat: 32.0655, lng: 34.774, baseDensity: 52 },
  { lat: 32.066, lng: 34.7752, baseDensity: 42 },
  { lat: 32.0662, lng: 34.7765, baseDensity: 38 },
  { lat: 32.0665, lng: 34.778, baseDensity: 48 },
  { lat: 32.0668, lng: 34.7795, baseDensity: 62 },
  { lat: 32.067, lng: 34.781, baseDensity: 82 },   // toward Dizengoff / busier
];

async function seedFromJson(): Promise<number> {
  const dataPath = path.join(__dirname, 'data', 'tel-aviv-density.json');
  console.log(`${LOG_PREFIX} Checking for JSON at ${dataPath}`);
  if (!fs.existsSync(dataPath)) {
    console.log(`${LOG_PREFIX} No prisma/data/tel-aviv-density.json found; skipping JSON load.`);
    return 0;
  }
  console.log(`${LOG_PREFIX} Loading and parsing tel-aviv-density.json`);
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as
    | { geohash: string; dayOfWeek: number; hour: number; baseDensity: number }[]
    | { zoneId?: string; name?: string; geohash: string; schedule: { dayOfWeek: number; hour: number; baseDensity: number }[] }[];

  let count = 0;
  const rows = Array.isArray(data)
    ? data.every((r) => 'geohash' in r && 'dayOfWeek' in r && 'hour' in r && 'baseDensity' in r)
      ? (data as { geohash: string; dayOfWeek: number; hour: number; baseDensity: number }[]).map((r) => ({
          geohash: toGeohash7(r.geohash),
          dayOfWeek: r.dayOfWeek,
          hour: r.hour,
          baseDensity: r.baseDensity,
        }))
      : (data as { geohash: string; schedule: { dayOfWeek: number; hour: number; baseDensity: number }[] }[]).flatMap((z) =>
          z.schedule.map((s) => ({
            geohash: toGeohash7(z.geohash),
            dayOfWeek: s.dayOfWeek,
            hour: s.hour,
            baseDensity: s.baseDensity,
          }))
        )
    : [];

  console.log(`${LOG_PREFIX} Upserting ${rows.length} rows from JSON (geohash normalized to level ${GEOHASH_LEVEL})`);
  for (const row of rows) {
    await prisma.trafficDensity.upsert({
      where: {
        geohash_dayOfWeek_hour: { geohash: row.geohash, dayOfWeek: row.dayOfWeek, hour: row.hour },
      },
      create: { geohash: row.geohash, dayOfWeek: row.dayOfWeek, hour: row.hour, baseDensity: row.baseDensity },
      update: { baseDensity: row.baseDensity },
    });
    count++;
  }
  if (count > 0) console.log(`${LOG_PREFIX} Seeded ${count} rows from tel-aviv-density.json`);
  return count;
}

async function seedHotspots(): Promise<number> {
  console.log(`${LOG_PREFIX} Seeding ${HOTSPOTS.length} hotspots for all days and hours (peak vs off-peak)`);
  let totalUpserted = 0;
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const peakSet = new Set(PEAK_DAYS.flatMap((d) => PEAK_HOURS.map((h) => `${d}:${h}`)));
  for (const spot of HOTSPOTS) {
    const geohash7 = encodeGeohash(spot.lat, spot.lng, GEOHASH_LEVEL);
    for (const dayOfWeek of allDays) {
      for (const hour of allHours) {
        const isPeak = peakSet.has(`${dayOfWeek}:${hour}`);
        const baseDensity = isPeak ? spot.peakDensity : OFF_PEAK_DENSITY;
        await prisma.trafficDensity.upsert({
          where: {
            geohash_dayOfWeek_hour: { geohash: geohash7, dayOfWeek, hour },
          },
          create: { geohash: geohash7, dayOfWeek, hour, baseDensity },
          update: { baseDensity },
        });
        totalUpserted++;
      }
    }
    console.log(`${LOG_PREFIX} Hotspot ${spot.name}: geohash7=${geohash7}, peak=${spot.peakDensity}, offPeak=${OFF_PEAK_DENSITY}`);
  }
  console.log(`${LOG_PREFIX} Hotspots total rows upserted: ${totalUpserted}`);
  return totalUpserted;
}

async function seedRoutePoints(): Promise<number> {
  console.log(`${LOG_PREFIX} Seeding ${ROUTE_POINTS.length} route points (all days/hours) for location-based revenue`);
  let total = 0;
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  for (let i = 0; i < ROUTE_POINTS.length; i++) {
    const pt = ROUTE_POINTS[i];
    const geohash7 = encodeGeohash(pt.lat, pt.lng, GEOHASH_LEVEL);
    for (const dayOfWeek of allDays) {
      for (const hour of allHours) {
        await prisma.trafficDensity.upsert({
          where: {
            geohash_dayOfWeek_hour: { geohash: geohash7, dayOfWeek, hour },
          },
          create: { geohash: geohash7, dayOfWeek, hour, baseDensity: pt.baseDensity },
          update: { baseDensity: pt.baseDensity },
        });
        total++;
      }
    }
    console.log(`${LOG_PREFIX} Route point ${i + 1}/${ROUTE_POINTS.length}: geohash7=${geohash7}, baseDensity=${pt.baseDensity}`);
  }
  console.log(`${LOG_PREFIX} Route points total rows upserted: ${total}`);
  return total;
}

async function main(): Promise<void> {
  console.log(`${LOG_PREFIX} Starting TrafficDensity seed (geohash level ${GEOHASH_LEVEL})`);
  const fromJson = await seedFromJson();
  const fromHotspots = await seedHotspots();
  const fromRoute = await seedRoutePoints();
  const total = await prisma.trafficDensity.count();
  console.log(`${LOG_PREFIX} TrafficDensity seed done. JSON=${fromJson}, hotspots=${fromHotspots}, route=${fromRoute}, total=${total}`);
}

main()
  .then(() => {
    console.log(`${LOG_PREFIX} Disconnecting Prisma`);
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(`${LOG_PREFIX} Fatal error:`, e);
    prisma.$disconnect();
    process.exit(1);
  });
