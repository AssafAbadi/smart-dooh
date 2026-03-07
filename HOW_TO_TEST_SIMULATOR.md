# How to Test with the Driving Simulator

## ✅ What I just fixed:

1. **Ad flickering** - Changed polling from 5s to 30s when stationary (won't disappear/reappear constantly)
2. **Only 1 ad** - Added 5 more campaigns in different Tel Aviv locations
3. **Simulator setup** - Instructions below

---

## Step-by-Step: Test Location-Based Ads

### 1. Enable Simulator Mode in the App

On your iPhone:
1. Open the app (should show the Drive screen with the coffee ad)
2. **Tap the hamburger menu (☰)** in the top-left
3. You'll see a **Settings/Debug screen**
4. **Toggle "Simulator Mode" ON**
5. Go back to the Drive screen

### 2. Start the Mock Driver Simulator

In a **new terminal** (keep the mobile app running):

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
npm run run
```

You'll see:
```
=== Simulated Tel Aviv Drive ===
📍 Starting at: Rothschild Blvd
[1] 32.062800,34.771700 ...
[2] 32.065000,34.772000 ...
...
```

### 3. Watch the Ads Change!

As the simulator "drives" through Tel Aviv, the app will:
- Poll the backend every 4 seconds for the simulated position
- Fetch new ads based on that location
- Show different ads as you "drive" through different areas

**You should see ads for:**
- ☕ Coffee (original - central Tel Aviv)
- 👗 Fashion Sale (Dizengoff area)
- 🥬 Fresh Food (Carmel Market)
- 🍺 Happy Hour (Rothschild)
- 🎨 Art Gallery (Jaffa)
- 🦞 Seafood (Port area)

---

## How It Works

```
Mock Simulator → POST to backend /simulator/position
                 (stores position in Redis with 60s TTL)
                      ↓
Mobile App → GET /simulator/position?driverId=sim-driver-1
             (when simulator mode is ON)
                      ↓
Mobile App → GET /ad-selection/ranked?lat=X&lng=Y&...
             (fetches ads for that location)
                      ↓
             Shows location-based ads on screen
```

---

## Troubleshooting

**Simulator mode not showing different ads?**
- Make sure you toggled "Simulator Mode" ON in the app settings
- Make sure the simulator script is running (`npm run run`)
- Check the backend is running on port 3000
- The backend must have Redis running to store simulated positions

**"Activate new ad" button shows same ad?**
- Before: Only 1 campaign existed
- Now: 6 campaigns exist, but they're **location-based**
- The button fetches ads for your *current location*
- If you're not in simulator mode, it uses Tel Aviv fallback (32.08, 34.78)
- Multiple campaigns might target the same area, so you might see the same ad

**To see different ads without simulator:**
- Each campaign has a specific geofence (circle around a location)
- The fallback location (32.08, 34.78) might only match 1-2 campaigns
- Use simulator mode to "drive" through all the different areas

---

## Real-World Restaurant Ads?

Currently, the campaigns use **fake data** (Tel Aviv Café business with various promotions).

To show **real restaurant ads**, you would need to:
1. Create a Business for each real restaurant in the database
2. Create Campaigns for each business with their actual location
3. Create Creatives with real headlines, images, and offers

You can do this via:
- **Admin Dashboard** (http://localhost:3001) - UI for creating campaigns
- **Direct database inserts** - Like the `seed-more-campaigns.js` script I just ran
- **API calls** - POST to `/admin/campaigns` with campaign data

The simulator will then show those real restaurant ads when "driving" near them!
