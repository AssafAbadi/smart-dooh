/**
 * Hash device IDs (e.g. from BLE scan) with SHA256 for unique_devices_detected metric.
 * In React Native we use a simple hash when crypto.subtle isn't available; for production use expo-crypto or native module.
 */
export function hashDeviceId(deviceId: string): string {
  // Simple hash for demo; in production use expo-crypto digest or react-native getRandomValues + crypto
  let h = 0;
  const s = deviceId;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return `ble-${Math.abs(h).toString(16)}`;
}
