# 📱 Expo Go Setup Guide - Connecting Your Phone to the App

## 🎉 Great News: Expo is Starting!

I've started the Expo development server for your mobile app. Here's what's happening and what you need to do next:

---

## ✅ What Just Happened

### 1. **Fixed JSON Error**
- Fixed the `app.json` configuration file
- Added missing `extra` field for Expo

### 2. **Installed Dependencies**
- Ran `npm install` in `apps/mobile-driver`
- Installed @sentry/react-native and other required packages

### 3. **Started Expo Dev Server**
- Running `npx expo start` in background
- Metro Bundler is compiling your React Native app
- QR code will appear soon!

---

## 📱 What "npx expo start" Does

When you run `npx expo start`, it:

### 1. **Starts Metro Bundler**
- Metro is the JavaScript bundler for React Native
- It compiles your TypeScript/JavaScript code
- Watches for file changes (hot reload)

### 2. **Creates a Development Server**
- Runs on your local network (e.g., `192.168.1.5:8081`)
- Serves your app code to connected devices
- Shows a QR code in the terminal

### 3. **Enables Communication**
- Your phone connects to your computer
- App updates instantly when you change code
- Logs appear in your terminal

---

## 🔍 How to Connect Your Phone (Step-by-Step)

### Step 1: Install Expo Go on Your Phone

**iOS (iPhone/iPad)**:
1. Open App Store
2. Search "Expo Go"
3. Download and install

**Android**:
1. Open Google Play Store
2. Search "Expo Go"
3. Download and install

---

### Step 2: Check the Terminal Output

The Expo server should show something like:

```
› Metro waiting on exp://192.168.1.5:8081
› Scan the QR code above with Expo Go (Android) or Camera (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

**Look for**:
- ✅ **QR Code** (ASCII art in terminal)
- ✅ **URL** like `exp://192.168.1.5:8081`
- ✅ **"Metro waiting"** message

---

### Step 3: Scan the QR Code

**iOS (Camera App)**:
1. Open the default **Camera** app
2. Point camera at the QR code in your terminal
3. A notification will appear: "Open in Expo Go"
4. Tap the notification
5. Expo Go will open and load your app!

**Android (Expo Go App)**:
1. Open the **Expo Go** app
2. Tap **"Scan QR code"** button
3. Point camera at the QR code in your terminal
4. App will start loading automatically!

---

### Step 4: Wait for Bundle to Load

First time loading:
- ⏱️ Takes 30-60 seconds
- 📦 Downloading JavaScript bundle
- 🔄 "Building..." or "Loading..." message appears

You'll see progress like:
```
Building JavaScript bundle... 47%
```

---

### Step 5: See Your App!

Once loaded, you'll see:
- **🐛 Debug Tab**: Shows GPS, device ID, BLE status
- **🚗 Drive Tab**: Shows 2 ad slots (currently empty since backend isn't running)

---

## 🎯 What You Should See in Expo Go

### Debug Screen
```
GPS Location
📍 Lat: 32.0804, Lng: 34.7806

Device ID
🔑 abc-123-def-456

BLE Status
🔵 Status: Not Connected
```

### Drive Screen
```
[Ad Slot 1]
No ad loaded

[Ad Slot 2]
No ad loaded
```

*(Ads will appear once you start the backend API)*

---

## 🔧 Troubleshooting

### Problem 1: "Unable to connect to Metro"

**Cause**: Phone can't reach your computer

**Fix**:
1. Make sure phone and computer are on **same WiFi network**
2. Check firewall isn't blocking port 8081
3. Try manual connection:
   - In Expo Go, tap "Enter URL manually"
   - Enter: `exp://YOUR_COMPUTER_IP:8081`
   - Get your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

---

### Problem 2: "Network response timed out"

**Cause**: Slow network or firewall

**Fix**:
1. Restart Expo: Press `r` in terminal
2. Restart WiFi on phone
3. Try USB connection:
   ```bash
   npx expo start --tunnel
   ```
   (Uses ngrok for connection)

---

### Problem 3: "Error loading module"

**Cause**: Dependencies not installed properly

**Fix**:
```bash
cd apps/mobile-driver
npm install
npx expo start --clear
```

---

### Problem 4: QR Code Not Showing

**Cause**: Terminal too small or Metro still starting

**Fix**:
1. Wait 30-60 seconds for Metro to finish
2. Expand terminal window
3. Press `Shift + ?` to show QR code again

---

## 💡 Pro Tips

### Hot Reload
- Save any file → App updates instantly
- No need to scan QR code again
- Changes appear in ~1 second

### Shake to Debug
- Shake your phone (physical shake!)
- Opens developer menu
- Options: Reload, Debug, Performance Monitor

### View Logs
- Terminal shows console.log() output
- Errors appear in red
- Warnings in yellow

---

## 🚀 Next Steps

### 1. Connect Backend API

The app will show "No ads" until backend is running:

```bash
# In another terminal
cd C:\Users\asaf0\smart-dooh
npx nx build backend-api
node dist/apps/backend-api/src/main.js
```

### 2. Update API URL

Edit `apps/mobile-driver/.env`:
```
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000
```

Get your IP: `ipconfig` → look for "IPv4 Address"

### 3. Reload App

In Expo Go:
- Shake phone → tap "Reload"
- Or press `r` in terminal

---

## 📊 What's Running Now

```
✅ Expo Dev Server (Terminal: 511922)
   - Metro Bundler compiling app
   - Waiting for connections on port 8081
   - QR code should be visible

❌ Backend API (not started yet)
   - Needs to be built first
   - Will run on port 3000

❌ Admin Dashboard (not started yet)
   - Needs dependencies installed
   - Will run on port 3001
```

---

## 🎯 Quick Reference

### Expo Commands (in terminal)
- `r` - Reload app
- `m` - Toggle menu
- `a` - Open on Android emulator
- `i` - Open on iOS simulator (Mac only)
- `w` - Open in web browser
- `c` - Clear cache and restart
- `?` - Show all commands

### Development Workflow
1. **Edit code** → Save file
2. **App auto-reloads** on phone
3. **Check terminal** for logs/errors
4. **Shake phone** for debug menu

---

## ✅ Success Checklist

- [ ] Expo Go installed on phone
- [ ] Expo dev server started (`npx expo start`)
- [ ] QR code visible in terminal
- [ ] Phone on same WiFi as computer
- [ ] Scanned QR code with Expo Go
- [ ] App loaded successfully
- [ ] Can see Debug/Drive tabs

---

## 📞 Need Help?

**Check Terminal Output**:
```bash
# Read the terminal where Expo is running
# Look for:
# - "Metro waiting..." (good!)
# - "Error:" messages (check these)
# - QR code ASCII art
```

**Common Issues**:
- **"Cannot connect"**: Check WiFi, try --tunnel mode
- **"Module not found"**: Run `npm install`
- **"Syntax error"**: Check app.json is valid JSON
- **"Metro error"**: Try `npx expo start --clear`

---

## 🎉 You're Ready!

Once you see the app on your phone:
1. ✅ **Debug tab** shows GPS/device info
2. ✅ **Drive tab** ready for ads (once backend starts)
3. ✅ Hot reload works (edit code → instant update)

**Your phone is now the car screen!** 🚗📱

To actually see ads, you'll need to start the backend API next. But for now, you can explore the app interface and see that it's working!
