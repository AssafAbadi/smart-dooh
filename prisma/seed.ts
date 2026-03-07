import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Business tags (what a place is). Must match schema enum BusinessTag. */
const BusinessTag = {
  RESTAURANT: 'RESTAURANT',
  SERVES_ALCOHOL: 'SERVES_ALCOHOL',
  KOSHER: 'KOSHER',
  VEGAN: 'VEGAN',
  VEGETARIAN: 'VEGETARIAN',
  GAMBLING: 'GAMBLING',
} as const;
type BusinessTagType = (typeof BusinessTag)[keyof typeof BusinessTag];

/** Driver preference filters. Must match schema enum PreferenceFilter. */
const PreferenceFilter = {
  NO_ALCOHOL: 'NO_ALCOHOL',
  KOSHER_ONLY: 'KOSHER_ONLY',
  UNKOSHER_ONLY: 'UNKOSHER_ONLY',
  VEGAN_ONLY: 'VEGAN_ONLY',
  VEGETARIAN_ONLY: 'VEGETARIAN_ONLY',
  NO_GAMBLING: 'NO_GAMBLING',
} as const;
type PreferenceFilterType = (typeof PreferenceFilter)[keyof typeof PreferenceFilter];

const SIM_ALERT_HEADLINE = 'Simulator test alert';
const ROUTE_FIRST_LAT = 32.0642;
const ROUTE_FIRST_LNG = 34.7718;
const ROUTE_FIRST_RADIUS = 500;
/** Set SEED_EMERGENCY_ALERT_ACTIVE=true to enable emergency override; default off for testing normal ads. */
const EMERGENCY_ALERT_ACTIVE = process.env.SEED_EMERGENCY_ALERT_ACTIVE === 'true';

async function ensureDriver(prisma: PrismaClient, id: string) {
  await prisma.driver.upsert({
    where: { id },
    create: { id },
    update: {},
  });
}

/** Create one campaign and one creative for a business. Call only after campaigns wipe so businessId is guaranteed correct. */
async function createCampaignForBusiness(
  prisma: PrismaClient,
  businessId: string,
  businessName: string,
  headline: string,
  body: string,
  couponCode: string,
  point: { lat: number; lng: number; radiusMeters: number },
  cpm: number,
  budgetRemaining: number,
  ratePerReach: number = 0.02 // ILS per estimated reach so driver balance updates when impressions are recorded
) {
  const campaign = await prisma.campaign.create({
    data: {
      businessId,
      cpm,
      budgetRemaining,
      ratePerReach,
      active: true,
      geofence: { type: 'circle', lat: point.lat, lng: point.lng, radiusMeters: point.radiusMeters },
    },
  });
  await prisma.creative.create({
    data: { campaignId: campaign.id, headline, body, couponCode, status: 'APPROVED' },
  });
  console.log(`Campaign+creative seeded for ${businessName}: ${headline} (geofence @ ${point.lat.toFixed(4)},${point.lng.toFixed(4)} r=${point.radiusMeters}m cpm=${cpm})`);
}

/** 8 points from mock-driver-simulator data/tel-aviv-route.json – geofences spread along route so different ads win at different points. */
const ROUTE_8_POINTS = [
  { lat: 32.0642, lng: 34.7718 }, // 1
  { lat: 32.065, lng: 34.7728 },  // 2
  { lat: 32.0655, lng: 34.774 },  // 3
  { lat: 32.066, lng: 34.7752 },  // 4
  { lat: 32.0662, lng: 34.7765 }, // 5
  { lat: 32.0665, lng: 34.778 },  // 6
  { lat: 32.0668, lng: 34.7795 }, // 7
  { lat: 32.067, lng: 34.781 },   // 8
] as const;
const GEOFENCE_RADIUS_M = 280; // Only one or two campaigns in range per simulator point

/** Real businesses – 600m radius so you get ads when ~500m from a venue (e.g. 32.072, 34.769 near Hayarkon). */
const REAL_BUSINESSES_RADIUS_M = 600;
const REAL_BUSINESSES = [
  {
    name: 'Nabi Yuna',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.KOSHER] as BusinessTagType[],
    lat: 32.0618,
    lng: 34.7628,
    headline: '20% off at Nabi Yuna – use code [COUPON_CODE]',
    body: 'Café & restaurant on Yona Hanavi. [DISTANCE] away.',
    couponCode: 'NABI20',
    cpm: 450,
    budgetRemaining: 100_000,
  },
  {
    name: "Chacho's Cafe Geula",
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.KOSHER] as BusinessTagType[],
    lat: 32.0862,
    lng: 34.7814,
    headline: "15% off at Chacho's – [COUPON_CODE]",
    body: 'Geula St 51, Tel Aviv. [DISTANCE] away.',
    couponCode: 'CHACHO15',
    cpm: 420,
    budgetRemaining: 90_000,
  },
  {
    name: 'Mob Deli',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.VEGETARIAN] as BusinessTagType[],
    lat: 32.0833,
    lng: 34.7784,
    headline: 'Mob Deli – 10% off with [COUPON_CODE]',
    body: 'Shlomo Ibn Gabirol 70 area. [DISTANCE] away.',
    couponCode: 'MOB10',
    cpm: 400,
    budgetRemaining: 80_000,
  },
  {
    name: "Gogi's Grill Bar",
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.SERVES_ALCOHOL] as BusinessTagType[],
    lat: 32.0671,
    lng: 34.7694,
    headline: "15% off at Gogi's Grill Bar – [COUPON_CODE]",
    body: 'Allenby 47, Tel Aviv. [DISTANCE] away.',
    couponCode: 'GOGI15',
    cpm: 430,
    budgetRemaining: 85_000,
  },
  {
    name: 'Norish Cafe',
    language: 'he',
    tags: [BusinessTag.RESTAURANT] as BusinessTagType[],
    lat: 32.0673,
    lng: 34.7695,
    headline: 'Norish Cafe – 10% off with [COUPON_CODE]',
    body: 'Allenby 36, Tel Aviv. [DISTANCE] away.',
    couponCode: 'NORISH10',
    cpm: 400,
    budgetRemaining: 75_000,
  },
  {
    name: 'Bar 51',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.SERVES_ALCOHOL] as BusinessTagType[],
    lat: 32.0785,
    lng: 34.768,
    headline: 'Bar 51 – Happy hour [COUPON_CODE]',
    body: 'Hayarkon 59, Tel Aviv. [DISTANCE] away.',
    couponCode: 'BAR51',
    cpm: 440,
    budgetRemaining: 80_000,
  },
  {
    name: 'U.S. Embassy Branch Office Tel Aviv',
    language: 'en',
    tags: [BusinessTag.RESTAURANT] as BusinessTagType[],
    lat: 32.0766,
    lng: 34.7667,
    headline: 'U.S. Embassy Branch Office – [DISTANCE] away',
    body: '71 Hayarkon St, Tel Aviv. Consular services.',
    couponCode: '—',
    cpm: 350,
    budgetRemaining: 50_000,
  },
] as const;

/**
 * Seeds data for development/demo.
 * - Businesses: tags only. Each business gets exactly one campaign and one creative, linked by businessId.
 * - We wipe all campaigns (and creatives) then recreate so every ad matches the correct business.
 */
async function main() {
  // --- 1) Ensure all 4 businesses exist (unique by name), get stable IDs ---
  const telAvivCafeData = {
    name: 'Tel Aviv Café',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.KOSHER, BusinessTag.VEGETARIAN] as BusinessTagType[],
  } as Prisma.BusinessCreateInput;
  let telAvivCafe = await prisma.business.findFirst({ where: { name: 'Tel Aviv Café' } });
  if (!telAvivCafe) {
    telAvivCafe = await prisma.business.create({ data: telAvivCafeData });
    console.log('Tel Aviv Café (RESTAURANT, KOSHER, VEGETARIAN) created.');
  } else {
    await prisma.business.update({ where: { id: telAvivCafe.id }, data: telAvivCafeData });
  }

  const greenLeafData = {
    name: 'Green Leaf Vegan',
    language: 'en',
    tags: [BusinessTag.RESTAURANT, BusinessTag.VEGAN, BusinessTag.VEGETARIAN] as BusinessTagType[],
  } as Prisma.BusinessCreateInput;
  let greenLeaf = await prisma.business.findFirst({ where: { name: 'Green Leaf Vegan' } });
  if (!greenLeaf) {
    greenLeaf = await prisma.business.create({ data: greenLeafData });
    console.log('Green Leaf Vegan (RESTAURANT, VEGAN, VEGETARIAN) created.');
  } else {
    await prisma.business.update({ where: { id: greenLeaf.id }, data: greenLeafData });
  }

  const barData = {
    name: 'Rothschild Bar',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.SERVES_ALCOHOL] as BusinessTagType[],
  } as Prisma.BusinessCreateInput;
  let bar = await prisma.business.findFirst({ where: { name: 'Rothschild Bar' } });
  if (!bar) {
    bar = await prisma.business.create({ data: barData });
    console.log('Rothschild Bar (RESTAURANT, SERVES_ALCOHOL) created.');
  } else {
    await prisma.business.update({ where: { id: bar.id }, data: barData });
  }

  const meatWineData = {
    name: 'Meat & Wine Kosher',
    language: 'he',
    tags: [BusinessTag.RESTAURANT, BusinessTag.KOSHER, BusinessTag.SERVES_ALCOHOL] as BusinessTagType[],
  } as Prisma.BusinessCreateInput;
  let meatWine = await prisma.business.findFirst({ where: { name: 'Meat & Wine Kosher' } });
  if (!meatWine) {
    meatWine = await prisma.business.create({ data: meatWineData });
    console.log('Meat & Wine Kosher (RESTAURANT, KOSHER, SERVES_ALCOHOL) created.');
  } else {
    await prisma.business.update({ where: { id: meatWine.id }, data: meatWineData });
  }

  // --- 1b) Real businesses (Nabi Yuna, Chacho's Cafe Geula, Mob Deli) ---
  const realBusinesses: { id: string; name: string }[] = [];
  for (const b of REAL_BUSINESSES) {
    const data = {
      name: b.name,
      language: b.language,
      tags: [...b.tags],
    } as Prisma.BusinessCreateInput;
    let biz = await prisma.business.findFirst({ where: { name: b.name } });
    if (!biz) {
      biz = await prisma.business.create({ data });
      console.log(`${b.name} created.`);
    } else {
      await prisma.business.update({ where: { id: biz.id }, data });
    }
    realBusinesses.push({ id: biz.id, name: biz.name });
  }

  // --- 2) Wipe all campaigns (creatives cascade) so we can recreate with correct businessId ---
  const deleted = await prisma.campaign.deleteMany({});
  console.log(`Deleted ${deleted.count} campaign(s) (creatives cascaded).`);

  // --- 3) Create exactly one campaign + one creative per business; geofences spread along 8-point route so ad changes as simulator moves ---
  await createCampaignForBusiness(
    prisma,
    telAvivCafe.id,
    'Tel Aviv Café',
    '20% off your next coffee – use code [COUPON_CODE]',
    '[DISTANCE] away • Open [TIME_LEFT]',
    'CAFE20',
    { lat: ROUTE_8_POINTS[0].lat, lng: ROUTE_8_POINTS[0].lng, radiusMeters: GEOFENCE_RADIUS_M },
    400,
    100_000
  );
  await createCampaignForBusiness(
    prisma,
    greenLeaf.id,
    'Green Leaf Vegan',
    'Vegan bowl 15% off',
    '[DISTANCE] away • Plant-based',
    'VEGAN15',
    { lat: ROUTE_8_POINTS[2].lat, lng: ROUTE_8_POINTS[2].lng, radiusMeters: GEOFENCE_RADIUS_M },
    550,
    80_000
  );
  await createCampaignForBusiness(
    prisma,
    bar.id,
    'Rothschild Bar',
    'Happy Hour 2-for-1',
    '[DISTANCE] away • 17:00–19:00',
    'BAR2FOR1',
    { lat: ROUTE_8_POINTS[4].lat, lng: ROUTE_8_POINTS[4].lng, radiusMeters: GEOFENCE_RADIUS_M },
    500,
    90_000
  );
  await createCampaignForBusiness(
    prisma,
    meatWine.id,
    'Meat & Wine Kosher',
    'Kosher steak night',
    '[DISTANCE] away • Reserve now',
    'KOSHER20',
    { lat: ROUTE_8_POINTS[6].lat, lng: ROUTE_8_POINTS[6].lng, radiusMeters: GEOFENCE_RADIUS_M },
    450,
    70_000
  );

  // --- 3b) Campaigns for real businesses (300m radius) ---
  for (let i = 0; i < REAL_BUSINESSES.length; i++) {
    const b = REAL_BUSINESSES[i];
    const { id } = realBusinesses[i];
    await createCampaignForBusiness(
      prisma,
      id,
      b.name,
      b.headline,
      b.body,
      b.couponCode,
      { lat: b.lat, lng: b.lng, radiusMeters: REAL_BUSINESSES_RADIUS_M },
      b.cpm,
      b.budgetRemaining
    );
  }

  // --- Drivers: driver-1 has no filters so you see all ads ---
  await ensureDriver(prisma, 'driver-1');
  await prisma.driver.update({
    where: { id: 'driver-1' },
    data: { balance: 12.5 },
  });
  await prisma.driverPreferences.upsert({
    where: { driverId: 'driver-1' },
    create: {
      driverId: 'driver-1',
      preference_tags: [],
      excludedLanguages: [],
    } as Prisma.DriverPreferencesUncheckedCreateInput,
    update: { preference_tags: [], excludedLanguages: [] } as Prisma.DriverPreferencesUncheckedUpdateInput,
  });
  console.log('Driver driver-1: no filters (sees all ads), balance 12.50 ILS for testing.');

  await ensureDriver(prisma, 'sim-driver-1');
  await prisma.driverPreferences.upsert({
    where: { driverId: 'sim-driver-1' },
    create: { driverId: 'sim-driver-1' },
    update: {},
  });
  console.log('Driver sim-driver-1: no restrictions (simulator sees all ads on route).');

  await ensureDriver(prisma, 'vegan-driver');
  await prisma.driverPreferences.upsert({
    where: { driverId: 'vegan-driver' },
    create: {
      driverId: 'vegan-driver',
      preference_tags: [PreferenceFilter.VEGAN_ONLY] as PreferenceFilterType[],
    } as Prisma.DriverPreferencesUncheckedCreateInput,
    update: { preference_tags: [PreferenceFilter.VEGAN_ONLY] as PreferenceFilterType[] } as Prisma.DriverPreferencesUncheckedUpdateInput,
  });
  console.log('Driver vegan-driver: [VEGAN_ONLY] (sees only Green Leaf when in geofence).');

  // --- EmergencyAlert for simulator ---
  const existing = await prisma.emergencyAlert.findFirst({
    where: { headline: SIM_ALERT_HEADLINE },
  });
  if (existing) {
    await prisma.emergencyAlert.update({
      where: { id: existing.id },
      data: { active: EMERGENCY_ALERT_ACTIVE, lat: ROUTE_FIRST_LAT, lng: ROUTE_FIRST_LNG, radiusMeters: ROUTE_FIRST_RADIUS },
    });
    console.log('EmergencyAlert updated:', existing.id, EMERGENCY_ALERT_ACTIVE ? '(active)' : '(inactive – run simulator to see filtered ads)');
  } else {
    const alert = await prisma.emergencyAlert.create({
      data: {
        headline: SIM_ALERT_HEADLINE,
        body: 'Emergency override verification',
        active: EMERGENCY_ALERT_ACTIVE,
        lat: ROUTE_FIRST_LAT,
        lng: ROUTE_FIRST_LNG,
        radiusMeters: ROUTE_FIRST_RADIUS,
      },
    });
    console.log('EmergencyAlert seeded:', alert.id, EMERGENCY_ALERT_ACTIVE ? '(active)' : '(inactive)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
