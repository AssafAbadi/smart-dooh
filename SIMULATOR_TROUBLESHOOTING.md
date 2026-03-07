# Simulator Not Working - Step-by-Step Fix

## The Problem
You run the simulator on PC but the ads on your phone don't change.

## Root Causes

### 1. Simulator Mode Not Enabled
The app needs simulator mode toggled ON **before** it will poll for simulated positions.

### 2. App Not Reloaded After Enabling
After toggling simulator mode, the app needs to be reloaded for the hooks to activate.

### 3. Polling Interval Too Long
The app polls for ads every 30 seconds (stationary mode), so changes may take time to appear.

---

## Step-by-Step Fix

### Step 1: Enable Simulator Mode in App

**On your iPhone:**

1. Open the app (you should see the Drive screen)
2. **Tap the hamburger menu (☰)** in the top-left
   - It should now be clickable (we fixed the iOS padding issue)
3. You'll see "Admin Room" screen
4. Find the button: **"Start simulator mode (use PC drive)"**
5. **Tap it** - it should change to: **"Turn off simulator mode"**
6. Check the status text shows: **"ON – ads follow simulated route"**

### Step 2: RELOAD THE APP

**This is critical!** The simulator position hook only activates when simulator mode is ON at app start.

**In the Expo terminal, press:**
```
r
```
(lowercase r to reload)

**Or:** Close and reopen the app on your phone.

### Step 3: Verify Simulator Mode is Still ON

After reload:
- Tap hamburger menu (☰) again
- Check status still shows: **"ON – ads follow simulated route"**
- If it's OFF, toggle it ON again and reload again

### Step 4: Run the Simulator on PC

**In a new PowerShell terminal:**
```powershell
cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
npm run run
```

You should see:
```
Loaded 8 points from Tel Aviv route. API_BASE=http://localhost:3000
Point 1/8 context: businesses=1, pois=0
Point 1/8 ranked: 6 ad(s), first: [campaign-id]
...
```

### Step 5: Watch the Phone for Changes

**Timeline:**
- Simulator posts position every ~3 seconds
- Phone polls simulator position every 4 seconds
- Phone fetches new ads every 30 seconds (stationary) or 10 seconds (moving)

**So expect:**
- **First change:** After 30-35 seconds
- **Subsequent changes:** Every 30 seconds as location updates

**What to look for:**
- Location text at bottom of screen should update
- Ad headline/body should change based on new location
- Different campaigns show as you "drive" through different neighborhoods

---

## Debugging Checklist

### ✅ Verify These Settings:

1. **Backend running?**
   - Check terminal: Should see "Nest application successfully started"
   - Port 3000 should be listening

2. **Redis running?**
   - `docker ps | findstr redis` should show running container
   - Simulator needs Redis to store positions

3. **Correct IP in .env?**
   - `apps/mobile-driver/.env` should have: `EXPO_PUBLIC_API_URL=http://192.168.1.205:3000`
   - Must match your PC's current WiFi IP

4. **Simulator mode ON?**
   - Check in Admin Room screen
   - Status should say "ON – ads follow simulated route"

5. **App reloaded after toggling?**
   - Press `r` in Expo terminal after enabling simulator mode

### 🔍 Check Simulator Logs:

When simulator runs, you should see:
- ✅ "Point X/8 context: businesses=1, pois=0"
- ✅ "Point X/8 ranked: 6 ad(s), first: [id]"
- ✅ No "Simulator position push failed" errors
- ✅ No "Heartbeat failed" errors (after our fix)

### 🔍 Check Phone App Logs:

**In Expo terminal on PC:**
- Look for network requests
- Should see periodic fetches to `/simulator/position`
- Should see periodic fetches to `/ad-selection/ranked`

---

## Still Not Working?

### Quick Test: Manual Ad Fetch

On your phone:
1. Tap **"Activate new ad"** button
2. Ad should change immediately (forces a fetch)
3. If ad changes, the API is working
4. If not, check backend logs for errors

### Debug Simulator Position API:

**In PowerShell:**
```powershell
# Check if simulator position is stored (run WHILE simulator is running)
curl http://localhost:3000/simulator/position?driverId=sim-driver-1
```

**Expected response:**
```json
{"lat":32.0748,"lng":34.7752,"geohash":"sv94uf"}
```

**If you get `null`:**
- Simulator isn't posting positions successfully
- Check Redis is running
- Check backend logs for errors

### Force Immediate Change:

To test without waiting 30 seconds:

**Temporarily edit polling interval:**

File: `apps/mobile-driver/src/hooks/useAdaptivePolling.ts`

Change:
```typescript
const INTERVAL_STATIONARY_MS = 30000;
```

To:
```typescript
const INTERVAL_STATIONARY_MS = 5000; // 5 seconds for testing
```

Then reload app (press `r`). Ads should change every 5 seconds.

**Remember to change it back to 30000 after testing!**

---

## Expected Behavior (When Working)

### Without Simulator Mode:
- Location: "Location off – showing ads for Tel Aviv."
- Position: Fixed at 32.08, 34.78 (fallback)
- Ads: Same ad (highest CPM for Tel Aviv area)

### With Simulator Mode ON:
- Location: "Simulator mode – position from Tel Aviv drive"
- Position: Changes every few seconds (follows simulator)
- Ads: Different ads as you "drive" through different areas:
  - Coffee (central Tel Aviv)
  - Fashion (Dizengoff)
  - Fresh Food (Carmel Market)
  - Happy Hour (Rothschild)
  - Art Gallery (Jaffa)
  - Seafood (Port)

---

## Common Mistakes

1. ❌ **Forgot to toggle simulator mode ON**
2. ❌ **Forgot to reload app after toggling**
3. ❌ **Expecting instant changes** (takes 30s between ad updates)
4. ❌ **Simulator not running or crashed**
5. ❌ **Redis not running** (simulator needs it to store positions)
6. ❌ **Wrong IP in .env** (phone can't reach backend)

---

## Success Indicators

✅ Simulator logs show: "Point X/8 ranked: 6 ad(s)"
✅ No errors in simulator output
✅ Phone screen shows: "Simulator mode – position from Tel Aviv drive"
✅ Location coordinates change on phone
✅ Ads change as simulator progresses through route
✅ "Activate new ad" button shows different ads

If you see all these, **simulator is working!** 🎉
