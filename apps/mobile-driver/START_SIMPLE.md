# Start Mobile App (Simple - No Scripts)

**This is the working state from Feb 8, 2026:**

## PowerShell commands:

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver

# Set your current WiFi IP (check with: ipconfig)
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"

# Set offline mode to avoid Expo CLI bug
$env:EXPO_OFFLINE="1"

# Start Expo
npx expo start --go --clear
```

## What to expect:

- **"Skipping dependency validation in offline mode"** - This is GOOD, it avoids the Expo CLI bug
- **"Metro waiting on exp://192.168.1.205:8081"** - This is your PC's IP (not 127.0.0.1)
- **QR code appears** - Scan with iPhone Camera → "Open in Expo Go"

## On your iPhone:

- Scan QR with Camera app
- Tap "Open in Expo Go"
- App loads → Drive screen with ads

## If WiFi changes:

Update both IPs to match your new WiFi:
1. `.env` file: `EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:3000`
2. Start command: `$env:REACT_NATIVE_PACKAGER_HOSTNAME="YOUR_NEW_IP"`

---

**WORKING STATE:**
- App loads correctly ✅
- No white screen ✅  
- Ads show when IP is correct ✅
- Uses `EXPO_OFFLINE=1` to skip Expo CLI bug ✅
