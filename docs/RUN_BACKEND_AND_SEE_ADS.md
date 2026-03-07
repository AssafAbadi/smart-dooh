# Run Backend and See Ads on Your Phone

## 1. Sign-in and “remember me”

- **Yes, the app will remember you.** After sign-in, the auth token is stored on the device in **Expo SecureStore** (key: `adrive_auth_token`). Next time you open the app, it reads that token and sends you straight to the drive screen.
- **Where is the data?** Token is on the **phone**. User/session validation happens on the **backend** (Postgres). So:
  - **Postgres** must be running for sign-in and for all API calls (ads, heartbeat, etc.).
  - **Redis** is used by the backend for caching and rate limiting; the backend expects it to be available.

## 2. Fix the location error (NSLocation*UsageDescription)

- **Done in the project:** `app.json` now sets both `locationWhenInUsePermission` and `locationAlwaysAndWhenInUsePermission` in the `expo-location` plugin, and the location service catches permission errors so the app doesn’t crash.
- **If you still see the error in Expo Go:** Expo Go uses its own Info.plist. For the system to show your custom message and avoid the error, use a **development build** (e.g. `npx expo run:ios`) instead of Expo Go, or accept location when Expo Go prompts. The app will keep working without background location.

## 3. Run the backend so you see ads

**Prerequisites:** PostgreSQL and Redis running (see root `.env` and `docs/HOW_TO_RUN_AND_TEST_THE_APP.md`).

From the **repo root**:

```bash
# 1. Apply DB migrations
npx prisma migrate deploy

# 2. Seed DB (adds one sample campaign + creative + emergency alert)
npx prisma db seed

# 3. Build and run the backend
npx nx build backend-api
npx nx serve backend-api
```

Backend will be at **http://localhost:3000**.  
On your **phone**, the app must call this API: set `EXPO_PUBLIC_API_URL` in `apps/mobile-driver/.env` to your machine’s LAN IP and port, e.g.:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000
```

(Replace `YOUR_PC_IP` with the IP your phone uses to reach the PC, e.g. `192.168.1.5`.)

After the backend is running and the app has location (or at least no crash):

- The drive screen calls `GET /ad-selection/ranked?driverId=...&lat=...&lng=...&geohash=...`.
- With the seed data, you should see at least one ad in the two slots (e.g. “20% off your next coffee…”).

## 4. Mock Driver Simulator (Tel Aviv route)

The **simulator** is a **Node script** that walks a Tel Aviv route and calls the **backend** (context, ad-selection, heartbeat). It does **not** stream to your phone.

- **Run it** (with backend and Redis/Postgres running):

```bash
cd apps/mock-driver-simulator
npm install
npm run run
```

- **What it does:** Simulates one driver (`sim-driver-1` by default) moving along the route, calling the same backend APIs. Useful to test backend behavior and emergency overrides.
- **To “see” the simulation on your phone:** The phone app uses its **own** GPS and its own `driverId` (`driver-1`). So:
  - **Phone** → shows ads for the phone’s real location.
  - **Simulator** → just hits the backend from the script; it doesn’t push location to the phone.

To have the phone act as the “car screen” for the simulated driver you’d need an extra feature (e.g. phone in “simulator mode” using the same driver ID and a backend-stored or streamed position). Right now, run the simulator to verify the backend; use the phone for real location-based ads.

## 5. “Activate new ad” button

- **What it is:** A button on the drive screen that **manually triggers a new ad fetch** from the backend.
- **Behavior:** It calls the same logic as the automatic polling (`fetchRanked()`), so you get fresh ranked instructions for your current location. Use it to refresh the two ad slots without waiting for the next poll.
