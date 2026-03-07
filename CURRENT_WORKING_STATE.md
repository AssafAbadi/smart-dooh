# Current Working State (DO NOT REGRESS!)

**Last Updated:** Feb 8, 2026
**Status:** ✅ WORKING - App loads, ads show, simulator works

---

## 1. Mobile App Connection (WORKING)

### Start Command (PowerShell):
```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver

# Run these 3 commands one at a time:
$env:EXPO_OFFLINE="1"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"
npx expo start --go --clear
```

### Expected Output:
```
✅ Skipping dependency validation in offline mode
✅ Metro waiting on exp://192.168.1.205:8081
✅ QR code appears
```

### On iPhone:
- Scan QR with Camera app → "Open in Expo Go"
- App loads → Drive screen with ads visible
- Status bar warnings are normal and expected

---

## 2. Backend Services (WORKING)

### Backend API:
```powershell
cd c:\Users\asaf0\smart-dooh
$env:NODE_PATH="dist"
node dist/apps/backend-api/src/main.js
```
**Expected:** "Nest application successfully started" on port 3000

### Redis (required for simulator):
```powershell
docker run -d -p 6379:6379 redis:alpine
```
**Expected:** Redis running on port 6379

---

## 3. Database (WORKING)

**Status:** 
- ✅ 1 Business: "Tel Aviv Café"
- ✅ 4 Active Campaigns (location-specific with 350m geofences)
- ✅ 4 Creatives (all APPROVED)
- ✅ 2 Drivers: "sim-driver-1" (simulator), "driver-1" (mobile app)
- ✅ 0 Active Emergency Alerts
- ✅ Geofence filtering enabled in backend

**Campaigns cover:**
1. **Happy Hour 2-for-1 Drinks** - Point 1-2 (32.0642, 34.7718) - 350m radius, CPM 1000
2. **Coffee 20% off** - Point 3-4 (32.0655, 34.7740) - 350m radius, CPM 900
3. **Fashion Sale 50% OFF** - Point 5-6 (32.0662, 34.7765) - 350m radius, CPM 800
4. **Fresh Vegetables & Fruits** - Point 7-8 (32.0670, 34.7810) - 350m radius, CPM 700
5. Fresh Seafood (INACTIVE - too far from route)
6. Art Gallery (INACTIVE - too far from route)

---

## 4. Testing with Simulator (WORKING)

### Enable Simulator Mode:
1. On iPhone: Tap hamburger menu (☰) → "Admin Room"
2. Tap "Start simulator mode"
3. Status shows "ON – ads follow simulated route"
4. Go back to Drive screen

### Run Simulator:
```powershell
cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
npm run run
```

### What Happens:
- Simulator posts positions to backend every few seconds
- Mobile app polls for simulated position (every 4s)
- Ads change based on simulated location as you "drive" through Tel Aviv
- You'll see 6 different ads for different neighborhoods

---

## 5. Key Configuration Files

### `apps/mobile-driver/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.205:3000
```
**⚠️ IMPORTANT:** Update this IP whenever you change WiFi networks

### `apps/mobile-driver/package.json`:
```json
"scripts": {
  "start": "expo start",
  ...
}
```
**Note:** Simple command, no custom scripts

---

## 6. Known Issues (Expected/Normal)

### ✅ These are FINE:
- "Offline and no cached development certificate" - Expected with EXPO_OFFLINE=1
- "Location permission request failed" - Expected in Expo Go, fallback works
- "Skipping dependency validation in offline mode" - Intentional, avoids Expo CLI bug

### ❌ If you see these, something is wrong:
- "TypeError: Body is unusable: Body has already been read" - Run with EXPO_OFFLINE=1
- "Metro waiting on exp://127.0.0.1:8081" - Set REACT_NATIVE_PACKAGER_HOSTNAME to your IP
- White screen on app load - IP mismatch or Metro not running
- No ads showing - Check backend is running and .env has correct IP

---

## 7. Troubleshooting

### Changed WiFi?
1. Get new IP: `ipconfig` (look for "IPv4 Address")
2. Update `.env`: `EXPO_PUBLIC_API_URL=http://NEW_IP:3000`
3. Update start command: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="NEW_IP"`
4. Restart mobile app (Ctrl+C, then start again)

### App not loading?
1. Check Metro is showing your LAN IP (not 127.0.0.1)
2. Check backend is running on port 3000
3. Verify .env has correct IP
4. Try restarting with `--clear` flag

### Ads not changing with simulator?
1. Verify simulator mode is ON in app (Admin Room screen)
2. Check simulator script is running (`npm run run`)
3. Verify backend is running and connected to Redis
4. Check backend logs for `/simulator/position` POST requests

---

## 8. Important Settings

### Polling Intervals:
- **Stationary:** 15 seconds (reduced to avoid rate limiting)
- **Driving:** 8 seconds (reduced to avoid rate limiting)
- **Simulator poll:** 4 seconds (to track simulated position)

### Geofencing:
- **Backend has geofence filtering enabled** (Haversine distance calculation)
- Each campaign has a circular geofence (radius: 350m)
- Campaigns positioned along the simulator route
- Only ads within geofence radius are returned by API
- Ad selection uses CPM bidding among eligible campaigns within geofence

---

## 9. Files Changed to Reach Working State

**Key files that were modified:**
1. `apps/mobile-driver/.env` - Updated IP address
2. `apps/mobile-driver/src/hooks/useAdaptivePolling.ts` - Changed intervals to prevent flickering
3. Database - Added 5 more campaigns via script
4. `apps/mobile-driver/src/components/Header.tsx` - Added iOS status bar padding (JUST FIXED)

**Files to preserve:**
- All hook files in `apps/mobile-driver/src/hooks/`
- Store files in `apps/mobile-driver/src/stores/`
- Backend simulator module
- **Backend geofence filtering** in `apps/backend-api/src/ad-selection/repositories/campaign-creative.repository.ts`
- All database migrations

---

## 10. Quick Reference Commands

### Full startup sequence:
```powershell
# Terminal 1: Backend
cd c:\Users\asaf0\smart-dooh
$env:NODE_PATH="dist"
node dist/apps/backend-api/src/main.js

# Terminal 2: Mobile App
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
$env:EXPO_OFFLINE="1"
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"
npx expo start --go --clear

# Terminal 3: Simulator (optional, after enabling in app)
cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
npm run run
```

### Check services:
```powershell
# Backend health
curl http://localhost:3000/health

# Redis
docker ps | findstr redis

# What's on port 3000
netstat -ano | findstr :3000
```

---

**🎉 WORKING STATE CONFIRMED:**
- ✅ Mobile app loads without white screen
- ✅ Ads display correctly (1 ad slot, not 2)
- ✅ Geofence filtering works (backend filters by distance)
- ✅ 4 campaigns with location-specific targeting (350m radius)
- ✅ Simulator mode functional
- ✅ Ads change as simulator moves through different geofences
- ✅ No flickering (15s stationary, 8s driving polling)
- ✅ Proper iOS status bar handling
- ✅ Rate limiting in place (reduced polling to avoid 429 errors)

**DO NOT REGRESS THIS STATE!**
