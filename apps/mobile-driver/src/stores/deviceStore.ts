import { create } from 'zustand';

/** Hashed (SHA256) device IDs from BLE scan for unique_devices_detected metric. */
export interface DeviceStoreState {
  detectedDeviceHashes: Set<string>;
  uniqueCount: number;
  addDetectedDevice: (hashedId: string) => void;
  reset: () => void;
}

export const useDeviceStore = create<DeviceStoreState>((set) => ({
  detectedDeviceHashes: new Set(),
  uniqueCount: 0,
  addDetectedDevice: (hashedId) =>
    set((state) => {
      const next = new Set(state.detectedDeviceHashes);
      next.add(hashedId);
      return { detectedDeviceHashes: next, uniqueCount: next.size };
    }),
  reset: () =>
    set({ detectedDeviceHashes: new Set(), uniqueCount: 0 }),
}));
