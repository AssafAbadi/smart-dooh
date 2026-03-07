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
