# Working State (DO NOT REGRESS)

## Mobile App Connection (WORKING as of Feb 8, 2026)

**Command to start (PowerShell):**
```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"  # Your PC's LAN IP
$env:EXPO_OFFLINE="1"  # Skip Expo CLI dependency bug
npx expo start --go --clear
```

**Key configuration:**
- `package.json`: `"start": "expo start"` (simple, no custom scripts)
- Set `REACT_NATIVE_PACKAGER_HOSTNAME` env var to PC's IP before starting
- Flags: `--go` (Expo Go mode), `--clear` (clear cache)
- iPhone: Scan QR with Camera app → "Open in Expo Go"

**Expected behavior:**
- ✅ App loads without white screen
- ✅ Drive screen shows header, ad slots
- ✅ Location warning (expected in Expo Go - fallback works)
- ⚠️ May not appear in server list, but QR scanning works

**If changed WiFi:**
- Update IP in: `apps/mobile-driver/.env` → `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000`
- Update `REACT_NATIVE_PACKAGER_HOSTNAME` to new IP when starting

## Backend/Services

**Backend API:**
```powershell
cd c:\Users\asaf0\smart-dooh
$env:NODE_PATH="dist"
node dist/apps/backend-api/src/main.js
```

**Redis:**
```powershell
docker run -d -p 6379:6379 redis:alpine
```

**Mock Driver Simulator:**
```powershell
cd c:\Users\asaf0\smart-dooh\apps\mock-driver-simulator
npm run run
```
