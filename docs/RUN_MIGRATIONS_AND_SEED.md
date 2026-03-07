# Migrations, Prisma Client, and Seed

**From now on, these will be run for you when schema or seed changes are made:**

1. **Apply migrations** – `npx prisma migrate deploy`
2. **Regenerate Prisma client** – `npx prisma generate`
3. **Seed database** – `npx prisma db seed`

If `prisma generate` fails with **EPERM** (file in use), close the backend/IDE and run again, or run from a new terminal.

---

## Simulator and filter testing

The **simulator uses driver ID `sim-driver-1`**, which has **no preference restrictions**. So when you run the mock-driver-simulator and the app in simulator mode, you see **all ads** that match the route (Tel Aviv Café, Green Leaf Vegan, Rothschild Bar, Meat & Wine Kosher where their geofences match).

### Drivers and preferences (after seed)

| Driver ID      | Preferences              | Who sees what |
|----------------|--------------------------|----------------|
| **sim-driver-1** | None                     | Simulator / app in simulator mode → all ads on route |
| **driver-1**     | Kosher only, no alcohol  | Only Tel Aviv Café (kosher, no alcohol) |
| **vegan-driver** | Vegan only               | Only Green Leaf Vegan (when in its geofence) |

### Campaigns on the route (for simulator)

- **Tel Aviv Café** – existing campaigns (Happy Hour, Coffee, Fashion, Fresh Vegetables) at route points 1–4.
- **Green Leaf Vegan** – “Vegan bowl 15% off” at point 2 (32.0655, 34.774).
- **Rothschild Bar** – “Happy Hour 2-for-1” at point 3 (32.0662, 34.7765).
- **Meat & Wine Kosher** – “Kosher steak night” at point 4 (32.067, 34.781).

### Testing different filters

- **Simulator (all ads):** Run simulator + app in simulator mode → uses `sim-driver-1` → you should see a mix of café, vegan, bar, kosher steak ads as you move.
- **Kosher + no alcohol:** Use app **without** simulator mode (or call API with `driverId=driver-1`) → only Tel Aviv Café ads (and any other kosher, no-alcohol businesses).
- **Vegan only:** Call API with `driverId=vegan-driver` and a location in the Green Leaf geofence → only “Vegan bowl 15% off”.

To test from the API:

```bash
# All ads (simulator driver)
curl "http://localhost:3000/ad-selection/ranked?driverId=sim-driver-1&lat=32.0655&lng=34.774&geohash=sv8wrm2&timeHour=12"

# Only kosher, no alcohol (driver-1)
curl "http://localhost:3000/ad-selection/ranked?driverId=driver-1&lat=32.0655&lng=34.774&geohash=sv8wrm2&timeHour=12"

# Only vegan (vegan-driver)
curl "http://localhost:3000/ad-selection/ranked?driverId=vegan-driver&lat=32.0655&lng=34.774&geohash=sv8wrm2&timeHour=12"
```
