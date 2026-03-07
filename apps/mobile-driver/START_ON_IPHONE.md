# Connect your iPhone (simple, no scripts)

Run these commands **in PowerShell**:

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver

# Set your PC's IP (replace with your actual IP from ipconfig)
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"

# Start Expo
npx expo start --go --clear
```

Wait for Metro to show **"Metro waiting on exp://192.168.1.205:8081"** (your IP, not 127.0.0.1) and a QR code.

**On iPhone:**
- **Scan the QR** with your Camera app → "Open in Expo Go"

**If it shows "fetch failed" or "Body already read":**
- Add `EXPO_OFFLINE=1` before expo:
  ```powershell
  $env:EXPO_OFFLINE="1"; $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.205"; npx expo start --go --clear
  ```
- The project won't show in the list; just scan the QR.

**The simulator:**
- The mock-driver-simulator works regardless of how you start the mobile app.
- EXPO_OFFLINE / tunnel / --go only affect the mobile app connection to Metro, not the simulator.
