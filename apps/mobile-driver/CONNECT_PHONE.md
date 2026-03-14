# Connect your phone

## Default: auto IP from ipconfig (same WiFi)

When you run **`npm start`**, the app detects your PC’s LAN IP (preferring **Wi‑Fi** like ipconfig) and updates `.env` and the Expo QR for you. No need to edit `.env` when you change WiFi.

```bash
cd apps/mobile-driver
npm start
```

Use the QR code or the `exp://` URL from the terminal. **Phone and PC must be on the same WiFi.**

---

## Optional: tunnel (phone on a different network)

```bash
cd apps/mobile-driver
npm run start:tunnel
```

- **Wait 20–40 seconds** until you see a tunnel URL and QR code (first time may install `@expo/ngrok`).
- If you see "Tunnel URL not found" at first, wait a bit – it often appears after a few retries.
- **Do not** set `EXPO_OFFLINE=1` when using tunnel (tunnel needs network access).
- On your phone: open **Expo Go** → scan the **QR code** or enter the **tunnel URL** from the terminal.

## Backend API from any WiFi (optional)

If you deploy your backend to a public URL (e.g. Render, Railway), set `EXPO_PUBLIC_API_URL=https://your-backend.onrender.com` in `.env`. Then the API works from any network and `npm start` will leave that URL as-is (it only overwrites when the value looks like a LAN IP).

---

## Testing outside WiFi (walking on the street / cellular)

To test the app when you **leave your home WiFi** (e.g. walk outside with the phone on cellular), two things must be reachable from the internet:

1. **Backend API** – Your phone must reach the backend over the internet. Use **ngrok**:
   - Start the backend: `npx nx serve backend-api` (e.g. on port 3000).
   - In another terminal: `ngrok http 3000` (or install ngrok and run it).
   - Copy the **https** URL ngrok gives you (e.g. `https://abc123.ngrok-free.app`).
   - In `apps/mobile-driver/.env` set:  
     `EXPO_PUBLIC_API_URL=https://abc123.ngrok-free.app`  
   - The app already sends `ngrok-skip-browser-warning: 1` when the URL contains `ngrok`, so the API will respond. As long as the backend and ngrok are running, the app will keep getting ads and location-based content when you’re on cellular.

2. **Expo dev server (only if you need to reload the app outside)** – On home WiFi the app loads via LAN. Once you leave WiFi, the phone can’t reach your PC’s LAN IP. So:
   - **If the app is already open:** Only the API URL matters. Set `EXPO_PUBLIC_API_URL` to your ngrok URL as above; the app will keep calling that URL over cellular and things will keep changing (ads, places, etc.) as you walk.
   - **If you might reload the app while outside:** Start Expo with the **tunnel** so the bundle is served over the internet:  
     `npm run start:tunnel`  
     Then scan the tunnel QR with Expo Go. The app will load from the tunnel; API calls still go to `EXPO_PUBLIC_API_URL` (ngrok).

**Summary:** Set `EXPO_PUBLIC_API_URL` to your ngrok backend URL before leaving the house. Use `npm run start:tunnel` if you need to reload the app while on cellular. With ngrok + (optional) tunnel, it will work when you’re out of the house.
