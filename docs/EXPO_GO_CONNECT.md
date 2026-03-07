# Connect to the app from Expo Go (when QR or dev servers are stuck)

**Note:** On **iPhone**, Expo Go does **not** offer "Enter URL manually". You must connect via the **development servers list** in the app or by **scanning the QR code** with the Camera app.

## "Can't access this website" / URL shows old IP (e.g. 192.168.1.205) after WiFi change

After changing WiFi, your PC's IP changes. The QR or saved URL still points at the **old** IP, so the phone can't reach your PC.

**Fast fix – use tunnel (works on any network):** Run `npx expo start --go --tunnel` in `apps\mobile-driver`. Use the new URL or QR from the terminal. No need to update IPs. If you see **"ngrok tunnel took too long to connect"**, see the section below.

**Or fix LAN:** Run `ipconfig` to get your new IP. Set `EXPO_PUBLIC_API_URL=http://YOUR_NEW_IP:3000` in `apps\mobile-driver\.env`. Then run `npx expo start --go --lan --clear` and use the new exp:// URL in Expo Go. PC and phone must be on the same WiFi.

## Why QR says "no data were found" and tapping servers does nothing

This project has **expo-dev-client** installed. Without `--go`, Expo uses **dev-client mode** and prints QR codes with the **`exp+://`** scheme. The iPhone Camera and Expo Go don't open `exp+://` (that's for custom dev builds), so you get "No usable data found" and taps do nothing.

**Default start (offline):** Because of “fetch failed” / “Body has already been read” errors when Expo CLI calls its API, **`npm start`** now runs with **EXPO_OFFLINE=1** so Metro starts. In Expo Go the project may not appear in the list—use **“Enter URL manually”** and type the **exp://YOUR_PC_IP:8081** URL shown in the terminal.

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
npm start
```

Then on the phone: Expo Go → **Enter URL manually** → type the URL from the terminal (e.g. `exp://192.168.1.5:8081`). To try without offline (if your network works): **`npm run start:online`**.

---

## “Could not connect to the server” / URL shows **127.0.0.1** (e.g. after changing WiFi)

If Expo Go shows `exp://127.0.0.1:8082` (or any `127.0.0.1`), that’s wrong. **127.0.0.1 = “this device”** — on the phone that’s the phone itself, so it can’t reach your PC. After changing WiFi, the old URL is wrong anyway.

**Do this:**

1. **Quit Expo Go** on the phone (or clear the project from the list) so it doesn’t reuse the old URL.
2. On your **PC** (on the same home WiFi):
   ```powershell
   cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
   npm start
   ```
   (`npm start` uses `--lan` so the URL should be `exp://192.168.x.x:8081`, not 127.0.0.1.)
3. In the terminal, note the **URL** (e.g. `exp://192.168.1.5:8081`). The port might be 8081 or 8082.
4. On the **phone**, open Expo Go → **“Enter URL manually”** → type that **exact** URL (with your PC’s IP and the port from the terminal).
5. Phone and PC must be on the **same WiFi** (your home network). If it still fails, use tunnel: `npx expo start --go --tunnel` and connect to the tunnel URL.

---

## Ads stop after 20–30 s on cellular / display shows Mirror

On **ngrok free tier**, requests from the app (non-browser) can be shown an HTML "Visit Site" interstitial, so the backend never gets the request and returns nothing. The app already sends the **`ngrok-skip-browser-warning: 1`** header on all API calls so ngrok forwards to your backend. If you still see ads stop after a short while on cellular:

- Ensure you’re on the latest app bundle (reload after pulling the latest code).
- The **display cache** TTL is 5 minutes, so the last ad stays visible even if a few ranked requests fail.

---

## Balance / ranked "404" or "failed to connect"

If the app shows **Balance fetch failed: 404** or **Ad-selection ranked failed 404**, the app is calling a server that doesn’t have those routes. Usually the app is using the **wrong API URL** (e.g. Metro at `:8081` or an old LAN IP).

**Fix:**

1. In `apps/mobile-driver/.env` set:
   ```env
   EXPO_PUBLIC_API_URL=https://YOUR_NGROK_URL
   ```
   (e.g. `https://humberto-pretentative-latrice.ngrok-free.dev`). Use **https** and your real ngrok URL.

2. **Restart Metro** (stop Expo, then start again) so the new env is picked up.

3. **Reload the app** (shake → Reload, or reopen the project in the dev client). Check the logs: you should see `[Adrive] API base: your-ngrok-host.ngrok-free.dev`. If you see `192.168.x.x:8081` or `localhost:3000`, the app is still using the wrong base.

4. Ensure the **backend** is running (`npx nx serve backend-api`) and **ngrok** is running (`ngrok http 3000`) so the ngrok URL reaches your API.

---

## "ngrok tunnel took too long to connect" when using `--tunnel`

Expo’s built-in tunnel (ngrok) often times out on first try. Use these in order:

1. **Retry** – Run `npx expo start --go --tunnel` again; it often works on the 2nd or 3rd run.
2. **Clear cache and retry** – `npx expo start --go --tunnel --clear`.
3. **Use LAN instead** – If you can keep the phone on the same WiFi as your PC, use `npm start` or `npx expo start --go --lan`. Your **API/ads** still use `EXPO_PUBLIC_API_URL` (ngrok for the backend), so they work from any network; only the Metro connection needs same WiFi for reload.
4. **Firewall** – Temporarily allow Node/Expo or try on a different network (e.g. mobile hotspot). Corporate networks sometimes block ngrok.

There is no supported way in Expo to increase the tunnel timeout; the usual fix is retrying or using LAN.

---

## If you still have issues

### 1. Start the dev server fresh

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
npx expo start --go --lan --clear
```

Wait until you see something like:

- `Metro waiting on exp://192.168.x.x:8081` (or your PC’s IP)
- A QR code in the terminal

Leave this terminal open.

---

### 2. Connect without scanning the QR code

**On your phone (Expo Go app):**

1. Open **Expo Go**.
2. Tap **“Enter URL manually”** (or “Connect manually” / similar).
3. Type the URL you see in the terminal, for example:
   - `exp://192.168.1.5:8081`  
   Replace `192.168.1.5` with your **PC’s IP** (the one shown in the Expo terminal).
4. Connect.

**Finding your PC IP (Windows):**

```powershell
# In PowerShell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object -First 1).IPAddress
```

Or: **Settings → Network & Internet → Wi‑Fi → your network → properties** and look at “IPv4 address”.

---

### 3. If it still doesn’t connect: use tunnel mode

Tunnel avoids QR and LAN issues (phone and PC can be on different networks):

```powershell
cd c:\Users\asaf0\smart-dooh\apps\mobile-driver
npx expo start --go --tunnel
```

First time it may ask to install `@expo/ngrok`. Say yes.

Then in Expo Go:

- Either scan the **new** QR code (tunnel URL), or  
- Use **“Enter URL manually”** and paste the `exp://...` URL shown in the terminal (the one that looks like `exp://xxx.ngrok.io:...` or similar).

---

### 4. “Development servers” in Expo Go is stuck

- That list is **discovered over the network**. If nothing happens when you tap a server:
  - **Use “Enter URL manually”** with `exp://YOUR_PC_IP:8081` (from step 2).
- Make sure:
  - **Metro is running** in the terminal (`npx expo start` or `npx expo start --clear`).
  - Phone and PC are on the **same Wi‑Fi** (or use `--tunnel`).
  - **Firewall** allows Node/Expo on port 8081 (or use tunnel).

---

### Quick checklist

| Issue | What to do |
|--------|------------|
| QR: “no data were found” | Don’t rely on QR. Use **Enter URL manually** with `exp://PC_IP:8081`. |
| Development servers: tap does nothing | Use **Enter URL manually** with `exp://PC_IP:8081`. |
| No logs in CMD when tapping | Start dev server with `npx expo start --clear` and leave the terminal open; connect via manual URL. |
| Still can’t connect | Run `npx expo start --go --tunnel` and use the URL (or new QR) from the terminal. |
| “Could not connect” / URL is **127.0.0.1** (e.g. after WiFi change) | Don’t use 127.0.0.1. Restart with `npm start` (uses `--lan`), then in Expo Go use **Enter URL manually** with `exp://YOUR_PC_IP:8081` (see terminal). Same WiFi for phone and PC, or use `--tunnel`. |
| **TypeError: fetch failed** or **Body is unusable: Body has already been read** when starting Metro | Expo CLI hits a bug when calling Expo’s API. **`npm start`** now runs with **EXPO_OFFLINE=1** so Metro starts. The phone may not show the project in the list—in Expo Go tap **“Enter URL manually”** and type the **exp://…** URL from the terminal (e.g. `exp://192.168.1.5:8081`). Use **`npm run start:online`** to try without offline (if your network works with Expo’s API). |
