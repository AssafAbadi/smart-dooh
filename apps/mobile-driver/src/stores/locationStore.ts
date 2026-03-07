import { create } from 'zustand';

export interface LocationState {
  lat: number | null;
  lng: number | null;
  geohash: string | null;
  lastUpdated: number | null;
  isMoving: boolean;
  /** True when using fallback (e.g. permission denied in Expo Go) */
  isFallback: boolean;
  /** True when position comes from simulator (backend) */
  isSimulated: boolean;
  setLocation: (lat: number, lng: number, geohash: string, isFallback?: boolean, isSimulated?: boolean) => void;
  setMoving: (moving: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  geohash: null,
  lastUpdated: null,
  isMoving: false,
  isFallback: false,
  isSimulated: false,
  setLocation: (lat, lng, geohash, isFallback = false, isSimulated = false) =>
    set({ lat, lng, geohash, lastUpdated: Date.now(), isFallback, isSimulated }),
  setMoving: (isMoving) => set({ isMoving }),
}));
