# How to Run and Test the Smart DOOH App

This guide explains how to actually see and use your app on your computer and phone.

## 🎯 The Big Picture: What Apps Do You Have?

Your Smart DOOH platform has **3 applications** you can run:

1. **Backend API** (NestJS) - Runs on `localhost:3000`
2. **Admin Dashboard** (Next.js) - Runs on `localhost:3001` (web browser)
3. **Mobile Driver App** (React Native/Expo) - Runs on your **phone** OR emulator
4. **Mock Driver Simulator** (Node.js script) - Simulates a car driving

---

## ✅ YES, You CAN Run on Localhost!

You mentioned "I can't run on localhost, no?" - **You CAN!** Here's what runs where:

| App | Where It Runs | How You See It |
|-----|---------------|----------------|
| Backend API | `localhost:3000` | API endpoints (use Postman or browser) |
| Admin Dashboard | `localhost:3001` | Open in web browser |
| Mobile App | Your phone OR emulator | Expo Go app on your phone |
| Simulator | Terminal | Watch console output |

---

## 🚀 Step-by-Step: How to Run Everything

### Prerequisites Setup (One-Time)

Before you can run anything, you need to set up your environment:

```bash
# 1. Create .env file (copy from .env.example)
cp .env.example .env

# 2. Edit .env and add your database URL at minimum:
# DATABASE_URL="postgresql://user:password@localhost:5432/smart_dooh"
# REDIS_URL="redis://localhost:6379"
```

**Important**: You need PostgreSQL and Redis running. If you don't have them:

```bash
# Option 1: Docker (easiest)
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14
docker run --name redis -p 6379:6379 -d redis:6

# Option 2: Install locally (Windows)
# Download PostgreSQL: https://www.postgresql.org/download/windows/
# Download Redis: https://github.com/microsoftarchive/redis/releases
```

### 1. Running the Backend API

```bash
# In your project root
cd apps/backend-api
npm run dev

# You should see:
# [Nest] Application is running on: http://localhost:3000
```

**To test it's working:**
- Open browser: `http://localhost:3000/health` (should return `{"status":"ok"}`)
- Or try: `http://localhost:3000/metrics` (Prometheus metrics)

**What can you do with the backend?**
- API endpoints for ad selection, impressions, context
- Admin endpoints for campaign management
- Payment webhooks (Stripe)

---

### 2. Running the Admin Dashboard (Web UI)

This is a **web interface** you can see in your browser!

```bash
# In a NEW terminal
cd apps/admin-dashboard
npm run dev

# You should see:
# ✓ Ready on http://localhost:3001
```

**To use it:**
1. Open browser: `http://localhost:3001`
2. You'll see:
   - **Home page**: Analytics (OTS, conversion rate, impressions)
   - **Creatives page**: Moderate pending ad creatives
   - **Campaigns page**: Create, edit, delete campaigns with geofences

**Note**: Make sure the backend API is running first (on port 3000) because the dashboard calls the API!

---

### 3. Running the Mobile Driver App on Your Phone (RECOMMENDED!)

This is the **driver's car screen app**. Since you don't have a physical car screen, use your phone!

#### Step 1: Install Expo Go on Your Phone

- **iOS**: Download "Expo Go" from App Store
- **Android**: Download "Expo Go" from Google Play Store

#### Step 2: Start the Mobile App

```bash
# In a NEW terminal
cd apps/mobile-driver
npx expo start
```

You'll see a QR code in your terminal!

#### Step 3: Scan QR Code with Your Phone

- **iOS**: Open Camera app, point at QR code → tap "Open in Expo Go"
- **Android**: Open Expo Go app → tap "Scan QR code"

**Your phone will now display the driver app!** 🎉

You'll see:
- **Debug screen**: Shows GPS location, BLE status, device ID
- **Drive screen**: Shows 2 ad slots with real ads from the backend
- The app will poll the backend API every 30 seconds for new ads

**To test it:**
1. Make sure backend API is running on `localhost:3000`
2. Update `.env` in `apps/mobile-driver`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000
   ```
   Replace `YOUR_COMPUTER_IP` with your computer's local IP (e.g., `192.168.1.5`)
   
   Find your IP:
   - Windows: `ipconfig` (look for "IPv4 Address")
   - Mac/Linux: `ifconfig` (look for "inet")

3. Restart the Expo app: `npx expo start --clear`

**Real GPS (walk/drive and see ads change by location):** The app requests location permission and uses your phone's GPS when not in simulator mode. If you see "Location permission request failed" or "Permission denied" on iOS in **Expo Go**, the host app (Expo Go) may not apply our custom permission strings. In that case use a **development build** so the app has its own Info.plist: run `cd apps/mobile-driver && npx expo run:ios` (requires Xcode), or create a dev build with EAS and install on your device. Then location will work and ads will update based on your real position.

#### Different WiFi than your computer? You’ll still see ads
The app calls the backend using **EXPO_PUBLIC_API_URL** (your ngrok URL). The phone does **not** need to be on the same WiFi as your PC. As long as ngrok is running and the backend is up, the phone (on cellular or any WiFi) will get ads. Only the **Expo/Metro connection** (for loading the app bundle) may need same network or tunnel; API traffic always goes to ngrok.

#### Testing away from home (same Wi‑Fi or ngrok)

The API URL is controlled by `EXPO_PUBLIC_API_URL` in `apps/mobile-driver/.env`; no code changes are needed to switch between local and remote backends.

- **Same Wi‑Fi:** Set `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000` (e.g. `192.168.1.205`). Phone and PC must be on the same network.
- **Away from home (e.g. ngrok):**
  1. Run ngrok: `ngrok http 3000`
  2. Set `EXPO_PUBLIC_API_URL=https://YOUR_NGROK_URL` in `apps/mobile-driver/.env` (use the HTTPS URL ngrok shows)
  3. Restart Expo: `npx expo start --clear`
  The app will use the ngrok URL for all API calls. To view the car-top display in a browser, open `https://YOUR_NGROK_URL/display/driver-1` (that endpoint is public, no auth).

---

### 4. Running the Mock Driver Simulator

This is a **script that simulates a car driving** along a route in Tel Aviv!

#### What Does It Do?

The simulator:
- Loads a GeoJSON route (Tel Aviv route included)
- "Drives" along the route, emitting GPS coordinates
- Calls backend APIs every few seconds:
  - `GET /context-engine/context` (get nearby businesses)
  - `GET /ad-selection/ranked` (get ads)
  - `POST /car-screens/heartbeat` (send heartbeat)
  - `POST /impressions` (record impression)
- **Verifies**:
  - ✅ Redis caching (POI/weather)
  - ✅ Impression idempotency (duplicate `client_uuid`)
  - ✅ Emergency alert override

#### How to Run It:

```bash
# In a NEW terminal
cd apps/mock-driver-simulator
cd apps/mock-driver-simulator
npm start

# You'll see console output:
# [Simulator] Starting simulation...
# [Simulator] Point 1/142: lat=32.0804, lng=34.7806
# [Context] Found 5 businesses
# [AdSelection] Ranked 3 ads
# [Impression] Recorded impression: uuid-abc123
# ✅ Cache hit verified for POIs
```

**To test emergency alert override:**
1. Make sure you ran `npx prisma db seed` (creates emergency alert in DB)
2. Run simulator - it will detect the alert and show emergency creative instead of regular ads

**Route visualization:**
- The route is in `apps/mock-driver-simulator/data/tel-aviv-route.json`
- It's a 142-point GeoJSON LineString covering Tel Aviv
- You can replace it with your own route!

---

## 📱 Using Your Phone as the Car Screen (BEST OPTION!)

**Yes!** You can absolutely use your phone as the driver's screen. Here's how:

### Option 1: Expo Go (Recommended for Testing)

Follow steps in section 3 above. Your phone becomes the car screen!

**Pros:**
- No physical car screen needed
- Instant updates (hot reload)
- See real GPS from your phone

**Cons:**
- Need to keep Expo Go app open
- Not production-ready (but perfect for testing!)

### Option 2: Physical Device Build (Production)

```bash
cd apps/mobile-driver
npx expo build:android  # or build:ios
```

This creates an actual APK/IPA you can install on any Android/iOS device.

---

## 🧪 Testing the Full Flow

### Scenario 1: Driver Opens App and Sees Ads

1. Start backend API: `cd apps/backend-api && npm run dev`
2. Open mobile app on your phone (Expo Go)
3. **Expected behavior:**
   - App shows 2 ad slots
   - Polls backend every 30 seconds
   - Records impressions (check backend logs)
   - BLE status shows "Not Connected" (since no car nearby)

### Scenario 2: Admin Manages Campaigns

1. Start backend API: `cd apps/backend-api && npm run dev`
2. Start admin dashboard: `cd apps/admin-dashboard && npm run dev`
3. Open browser: `http://localhost:3001`
4. **Try these:**
   - View analytics (OTS, conversion rate)
   - Create a new campaign with geofence
   - Moderate pending creatives (approve/reject)

### Scenario 3: Simulated Driver Trip

1. Start backend API
2. Run simulator: `cd apps/mock-driver-simulator && npm start`
3. **Watch the console:**
   - GPS coordinates updating
   - API calls being made
   - Cache hits/misses
   - Impressions recorded

---

## ✅ Three things that must be running (why the app suddenly works)

The app shows **balance**, **ads**, and the **display page** only when these three are running:

| # | What | Command | Why |
|---|------|---------|-----|
| 1 | **Backend** | `npx nx serve backend-api` (from project root) | Serves `/payments/...`, `/ad-selection/ranked`, `/display/...`. |
| 2 | **ngrok** | `ngrok http 3000` (separate terminal) | Exposes backend at `https://humberto-pretentative-latrice.ngrok-free.dev`. If ngrok is **off**, you get "endpoint is offline" and the app gets 404 or no data. |
| 3 | **Metro (dev client)** | `npx expo start --dev-client` in `apps/mobile-driver` | Serves the app bundle. The app loads from here when you scan the QR. |

**What changed when it started working:** The ngrok tunnel was **offline** (ERR_NGROK_3200). Once **ngrok was started** (`ngrok http 3000`), the public URL forwarded to the backend. The backend was already on port 3000; nothing was restarted there. The app and display then worked because they could reach the API at the ngrok URL.

**Exact steps to open the app (dev client):**

1. Start **backend** (`npx nx serve backend-api`), **ngrok** (`ngrok http 3000`), and **Metro** (`npx expo start --dev-client` in `apps/mobile-driver`).
2. On your phone, open the **Adrive Development Build** app.
3. **Scan the QR code** from the Metro terminal (or tap the project under "Recently Opened").
4. The app loads the bundle from Metro and uses `EXPO_PUBLIC_API_URL` (ngrok URL) for all API calls. You should see ads and balance.

If `--dev-client` didn't work before, the usual cause was **ngrok not running** (tunnel offline), so API calls failed with 404 or "endpoint offline."

---

## ✅ Test right now (quick checklist)

Use this when the backend is running and the DB is seeded (Nabi Yuna, Chacho's Cafe Geula, Mob Deli; driver-1 has no filters).

| Step | What to do |
|------|------------|
| **1. Backend** | Ensure it’s running: `npx nx serve backend-api` (or already on port 3000). Open [http://localhost:3000/health](http://localhost:3000/health) → should return `{"status":"ok"}`. |
| **2. Ads from API** | In a browser: `http://localhost:3000/ad-selection/ranked?driverId=driver-1&lat=32.0618&lng=34.7628&geohash=sv8&timeHour=12` → should return JSON with `instructions` (e.g. Nabi Yuna when that point is in range). |
| **3. Display page** | Open [http://localhost:3000/display/driver-1](http://localhost:3000/display/driver-1). You should see either “Mirror – Open the app” or the last ad once the app has sent location. |
| **4. Mobile app** | In `apps/mobile-driver`: `npx expo start` (or `npx expo start --clear` if you changed `.env`). Scan the QR code with Expo Go. **Turn off simulator mode** in the app, allow location. Ads should load and update by your real position. |
| **5. Phone → backend** | Your `apps/mobile-driver/.env` has `EXPO_PUBLIC_API_URL=https://humberto-pretentative-latrice.ngrok-free.dev`. So the phone talks to the backend via ngrok. **Keep ngrok running** (`ngrok http 3000`) and the backend running; then the app on the phone will get ads. |
| **6. Display from elsewhere** | On another device/browser open `https://humberto-pretentative-latrice.ngrok-free.dev/display/driver-1` to see the same ad as the app (mirrors driver-1). |

**Quick “is the backend working?” test:**  
`http://localhost:3000/health` → ok  
`http://localhost:3000/display/driver-1` → shows Mirror or an ad  

**Quick “are ads by location working?” test:**  
Call the ranked URL above with different `lat`/`lng` (e.g. 32.0862, 34.7814 for Chacho’s area) and check that the returned ad changes when you’re inside a business geofence.

---

## 🌍 Real-world city test (live GPS and real businesses)

This section is for testing with **real location** and **real businesses** (e.g. your client restaurants), not the simulator or fake data.

### How it works

- **Mobile app** uses real GPS (`expo-location` with `startLocationUpdatesAsync`). It sends coordinates to:
  - **POST /driver/location** every 7 seconds (so the backend has your current position and can identify area/neighborhood via Google Geocoding).
  - **GET /ad-selection/ranked** (with the same lat/lng) on an adaptive interval (about 8–15 s) to get ads.
- **Backend** stores the last driver location in Redis and, when `GOOGLE_PLACES_API_KEY` is set, calls the Google Geocoding API to get **area/neighborhood** from the coordinates.
- **Ad selection** only shows ads for **businesses that are in your database** and whose **campaign geofence** contains your current (lat, lng). So when you walk past "Restaurant Y" and "Restaurant B" (your clients in the DB with geofences around their real address), the display switches to their ad. When you walk past "Restaurant W" (not a client, not in the DB), they are ignored.

All mobile requests (heartbeat, driver location, ad-selection, impressions) use **one base URL**: `EXPO_PUBLIC_API_URL` in `apps/mobile-driver/.env`. Set it to your backend so the phone can reach it from the cellular network or another Wi‑Fi.

### Step-by-step: testing with real location and real businesses

1. **Backend and DB**
   - Start PostgreSQL and Redis.
   - Run migrations: `npx prisma migrate deploy`
   - Seed: `npx prisma db seed` (creates sample businesses with geofences). For **your** restaurants, add them as businesses and create campaigns with geofences at their **real lat/lng** (e.g. via Admin Dashboard → Campaigns, or by editing the seed).
   - In backend `.env` set `GOOGLE_PLACES_API_KEY` (used for Geocoding and Places).
   - Start backend: `npx nx serve backend-api` (listens on `0.0.0.0:3000`).

2. **API URL so the phone reaches your computer**
   - **Same Wi‑Fi:** In `apps/mobile-driver/.env` set `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000` (e.g. `192.168.1.205`).
   - **From cellular or another network:** Run `ngrok http 3000`, then set `EXPO_PUBLIC_API_URL=https://YOUR_NGROK_URL` in `apps/mobile-driver/.env`. Restart Expo with `npx expo start --clear`.

3. **Mobile app**
   - Turn **off** simulator mode in the app (so it uses real GPS).
   - Allow location permission. On iOS in Expo Go, if location is denied, use a development build (`npx expo run:ios` or EAS) so real GPS works.
   - **If your phone is on 5G/cellular (not the same Wi‑Fi as your PC):** start Expo with a tunnel so the phone can talk back to your computer:  
     `cd apps/mobile-driver && npx expo start --tunnel`  
     Then scan the QR code from the terminal / Expo Dev Tools. The app will still use `EXPO_PUBLIC_API_URL` (your ngrok URL) for all API calls, but the **packager connection** to your phone goes over the Expo tunnel instead of local Wi‑Fi.
   - The app will POST to `/driver/location` every 7 s and request ranked ads using your real coordinates.

4. **Display (second computer / browser)**
   - Open the display URL in a browser. Same network: `http://YOUR_PC_IP:3000/display/driver-1`. With ngrok: `https://YOUR_NGROK_URL/display/driver-1`. No auth; it mirrors the last ad the backend selected for that driver.

5. **Walk the route**
   - Walk past your client restaurants (Y and B). When you enter each campaign’s geofence, the backend selects their ad and the display updates. Walk past a non-client (W); they are not in the DB, so their ad never appears.

### Adding your real restaurants (Y and B)

- **Option A – Admin Dashboard:** Create businesses (if needed) and campaigns with a **circle geofence**: center = restaurant’s real (lat, lng), radius e.g. 150–300 m. Approve creatives so ads are eligible.
- **Option B – Seed:** Duplicate the pattern in `prisma/seed.ts`: create a `Business` and a `Campaign` with `geofence: { type: 'circle', lat, lng, radiusMeters }` at the real coordinates, then run `npx prisma db seed`.

Ensure the geofence radius is large enough that standing in front of (or near) the restaurant is inside the circle.

---

## 🐛 Troubleshooting

### "Can't connect to backend from phone"

**Issue**: Mobile app can't reach `localhost:3000`

**Fix**: Change `EXPO_PUBLIC_API_URL` to your computer's IP:
```bash
# Find your IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Update .env
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000
```

### "Database connection failed"

**Issue**: Backend can't connect to PostgreSQL

**Fix**: Make sure PostgreSQL is running and `DATABASE_URL` in `.env` is correct:
```bash
# Test connection
psql -U postgres -d smart_dooh

# Or start Docker container
docker start postgres
```

### "Module not found" errors

**Fix**: Install dependencies:
```bash
npm install  # Root
cd apps/backend-api && npm install
cd ../mobile-driver && npm install
cd ../admin-dashboard && npm install
```

---

## 📊 What to Look For When Testing

### Backend API (`localhost:3000`)

- ✅ Metrics endpoint works: `/metrics`
- ✅ Ad selection returns ads: `/ad-selection/ranked?lat=32.08&lng=34.78&driverId=test`
- ✅ Impressions recorded: `POST /impressions` with `client_uuid`

### Admin Dashboard (`localhost:3001`)

- ✅ Analytics page shows OTS and conversion rate
- ✅ Campaigns page lists campaigns
- ✅ Creatives page shows pending ads for moderation

### Mobile App (on Phone)

- ✅ Debug screen shows GPS location
- ✅ Drive screen shows 2 ad slots
- ✅ Ads update every 30 seconds
- ✅ Impressions sent to backend (check backend logs)

### Simulator (Terminal)

- ✅ GPS coordinates updating along route
- ✅ Cache hits verified
- ✅ Impression idempotency verified
- ✅ Emergency alert override works

---

## 🎯 Summary: Your Testing Setup

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR TESTING SETUP                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  💻 YOUR COMPUTER                                            │
│  ├─ Backend API (localhost:3000)                            │
│  ├─ Admin Dashboard (localhost:3001) ← Open in browser     │
│  ├─ PostgreSQL (localhost:5432)                             │
│  └─ Redis (localhost:6379)                                  │
│                                                               │
│  📱 YOUR PHONE                                               │
│  └─ Mobile Driver App (Expo Go) ← Acts as car screen!      │
│                                                               │
│  🚗 SIMULATOR (in Terminal)                                  │
│  └─ Mock driver driving Tel Aviv route                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Next Steps:**
1. ✅ Start backend API
2. ✅ Open admin dashboard in browser
3. ✅ Open mobile app on your phone (Expo Go)
4. ✅ Run simulator to see it all working together!

You now have a **fully functional DOOH advertising platform** you can test! 🎉
