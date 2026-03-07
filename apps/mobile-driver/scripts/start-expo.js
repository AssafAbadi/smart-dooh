/**
 * Detects this PC's LAN IP (prefers Wi-Fi like ipconfig), updates .env with that IP,
 * then starts Expo so the QR and app API URL both use the same IP. Works on whatever
 * WiFi you're on without editing .env by hand.
 */
const path = require('path');
const { spawn } = require('child_process');
const { run, getLanIp } = require('./detect-lan-ip.js');

const appDir = path.join(__dirname, '..');
const ip = getLanIp();

if (!ip) {
  console.error('Could not detect LAN IP. Check ipconfig and set EXPO_PUBLIC_API_URL in .env manually.');
  process.exit(1);
}

run(); // updates .env with this IP

const env = { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: ip };

const child = spawn('npx', ['expo', 'start', '--go', '--lan'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: appDir,
});
child.on('exit', (code) => process.exit(code ?? 0));
