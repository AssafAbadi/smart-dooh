/**
 * Detects this PC's LAN IP (prefers Wi-Fi like ipconfig), updates .env with that IP,
 * then starts Expo so the QR and app API URL both use the same IP. Works on whatever
 * WiFi you're on without editing .env by hand.
 * Loads .env into the child process so EXPO_PUBLIC_* (e.g. ngrok) are in the bundle when you use cellular.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { run, getLanIp } = require('./detect-lan-ip.js');

const appDir = path.join(__dirname, '..');
const ip = getLanIp();

if (!ip) {
  console.error('Could not detect LAN IP. Check ipconfig and set EXPO_PUBLIC_API_URL in .env manually.');
  process.exit(1);
}

run(); // updates .env with this IP (keeps https e.g. ngrok)

/** Load .env into an object so the Expo child gets EXPO_PUBLIC_* in the bundle (e.g. ngrok for cellular). */
function loadEnvFile(dir) {
  const envPath = path.join(dir, '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      out[m[1]] = val;
    }
  }
  return out;
}

const dotenv = loadEnvFile(appDir);
const env = { ...process.env, ...dotenv, REACT_NATIVE_PACKAGER_HOSTNAME: ip };

// Forward extra args to Expo (e.g. npm start -- --dev --client => expo start --go --lan --dev --client)
const extraArgs = process.argv.slice(2);
const expoArgs = ['expo', 'start', '--go', '--lan', ...extraArgs];

const child = spawn('npx', expoArgs, {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: appDir,
});
child.on('exit', (code) => process.exit(code ?? 0));
