/**
 * Detects this machine's best LAN IPv4 (prefers Wi-Fi like ipconfig shows) and updates .env
 * so EXPO_PUBLIC_API_URL and the Expo QR use the same IP. Run before `expo start` so the app
 * works on whatever WiFi you're on without editing .env by hand.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');

const BACKEND_PORT = 3000;

function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    const isWifi =
      lower.includes('wi-fi') ||
      lower.includes('wifi') ||
      lower.includes('wlan') ||
      lower.includes('wireless') ||
      lower === 'en0'; // Mac Wi-Fi often en0

    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const a = iface.address;
      if (a.startsWith('169.')) continue; // link-local
      if (a.startsWith('192.168.56.')) continue; // often VirtualBox host-only
      candidates.push({ address: a, isWifi });
    }
  }

  // Prefer Wi-Fi adapter (same order as ipconfig: Wi-Fi first)
  const wifi = candidates.find((c) => c.isWifi);
  if (wifi) return wifi.address;
  if (candidates.length) return candidates[0].address;
  return null;
}

function updateEnvFile(envPath, ip) {
  const apiUrl = `http://${ip}:${BACKEND_PORT}`;
  let content = '';
  let replaced = false;

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^EXPO_PUBLIC_API_URL=(.*)$/m);
    const current = match ? match[1].trim() : '';
    // Only overwrite if current value looks like a LAN URL (keep https://deployed-url)
    const isPublicUrl = current.startsWith('https://');
    if (!isPublicUrl) {
      content = content.replace(
        /^EXPO_PUBLIC_API_URL=.*/m,
        () => {
          replaced = true;
          return `EXPO_PUBLIC_API_URL=${apiUrl}`;
        }
      );
    }
    if (!replaced) {
      fs.writeFileSync(envPath, content, 'utf8');
      return { apiUrl: current || apiUrl, updated: false };
    }
  } else if (!replaced) {
    content = `EXPO_PUBLIC_API_URL=${apiUrl}\n`;
    replaced = true;
  }

  if (replaced) fs.writeFileSync(envPath, content, 'utf8');
  return { apiUrl, updated: replaced };
}

const appDir = path.join(__dirname, '..');
const envPath = path.join(appDir, '.env');

function run() {
  const ip = getLanIp();
  if (!ip) {
    console.error('Could not detect LAN IP. Check ipconfig and set EXPO_PUBLIC_API_URL in .env manually.');
    process.exit(1);
  }
  const { apiUrl, updated } = updateEnvFile(envPath, ip);
  console.log('');
  console.log('Detected LAN IP (Wi-Fi preferred):', ip);
  if (updated) {
    console.log('Updated .env: EXPO_PUBLIC_API_URL=' + apiUrl);
  } else {
    console.log('Keeping existing EXPO_PUBLIC_API_URL (public URL). QR will still use', ip);
  }
  console.log('Phone and PC must be on the same WiFi.');
  console.log('');
  return ip;
}

if (require.main === module) run();

module.exports = { getLanIp, updateEnvFile, run, BACKEND_PORT };
