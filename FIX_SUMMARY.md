# Issues Fixed - Simulator Testing

## Problem 1: Emergency Alert Overriding All Ads ✅ FIXED

**Symptom:** Points 1-5 showed only "emergency" ad instead of regular ads

**Cause:** Active emergency alert in database (from testing) was overriding all regular ads within its 500m radius

**Fix:** Deactivated the emergency alert

```
Found 1 emergency alert: "Simulator test alert"
Location: 32.0642, 34.7718 (radius: 500m)
Status: Active → Deactivated
```

**Result:** Regular ads will now show at all route points

---

## Problem 2: Same Ad Showing Throughout Drive

**Symptom:** Points 6-8 had 6 ads available but showed the same ad

**Likely Cause:** The app polls every 30 seconds (stationary mode), but the simulator moves faster than that

**How it works:**
1. Simulator posts position every few seconds to `/simulator/position`
2. Mobile app polls `/simulator/position` every 4 seconds
3. Mobile app fetches ads every 30 seconds (stationary) or 10 seconds (moving)

**Why same ad shows:**
- The ad selection API returns ads sorted by CPM (highest bid first)
- All 6 campaigns target different locations, but one campaign has the highest CPM
- That campaign wins the auction and appears first in every API call
- The app shows `instructions[0]` (first ad) and `instructions[1]` (second ad)

**Expected Behavior:**
- As the simulator moves to different locations, different campaigns' geofences will match
- The winning ad should change based on which campaigns are eligible for each location

---

## Problem 3: Heartbeat Failing with HTTP 500 ⚠️ NEEDS INVESTIGATION

**Symptom:** "Heartbeat failed: HTTP 500: Internal server error" at every route point

**What it affects:** Only the heartbeat tracking (doesn't affect ad display)

**Possible causes:**
1. Missing or misconfigured car screen repository
2. Database constraint issue with deviceId/driverId
3. Repository trying to access a missing table or field

**Next steps to debug:**
- Check backend logs when heartbeat is called
- Verify CarScreen table exists and has correct schema
- Check if updateHeartbeat repository method is implemented correctly

**Impact:** LOW - Heartbeat is only for tracking device online status, doesn't affect ad serving

---

## How to Test Fixed State:

1. **Start fresh simulator run:**
   ```powershell
   cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
   npm run run
   ```

2. **What you should see:**
   - All 8 points should show regular ads (not "emergency")
   - Different locations may show different ads based on geofences
   - Ads change as simulator moves through different neighborhoods

3. **On your phone (with simulator mode ON):**
   - Ads should update every 4-10 seconds based on simulated position
   - You should see variety as you "drive" through Tel Aviv

---

## Current Campaign Locations:

1. **Coffee (original)** - Central Tel Aviv (32.08, 34.78) - 15km radius
2. **Fashion Sale** - Dizengoff (32.0748, 34.7752) - 2km radius
3. **Fresh Food** - Carmel Market (32.0733, 34.7667) - 1.5km radius
4. **Happy Hour** - Rothschild (32.0628, 34.7717) - 1km radius
5. **Art Gallery** - Jaffa (32.0543, 34.7516) - 1km radius
6. **Seafood** - Port (32.0913, 34.7753) - 1.5km radius

The simulator route goes through these areas, so you should see different ads as you pass through each neighborhood!

---

## Remaining Issues to Investigate:

1. ⚠️ Heartbeat HTTP 500 error (low priority - doesn't affect ads)
2. 🔍 Why same ad shows when multiple are available (need to check CPM values and location matching)

**Status:** Simulator should work much better now with emergency alert deactivated!
