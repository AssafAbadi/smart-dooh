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
  /** Compass heading in degrees (0 = North, 90 = East, etc.). null if unavailable. */
  heading: number | null;
  setLocation: (lat: number, lng: number, geohash: string, isFallback?: boolean, isSimulated?: boolean) => void;
  setMoving: (moving: boolean) => void;
  setHeading: (heading: number) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  geohash: null,
  lastUpdated: null,
  isMoving: false,
  isFallback: false,
  isSimulated: false,
  heading: null,
  setLocation: (lat, lng, geohash, isFallback = false, isSimulated = false) =>
    set({ lat, lng, geohash, lastUpdated: Date.now(), isFallback, isSimulated }),
  setMoving: (isMoving) => set({ isMoving }),
  setHeading: (heading) => set({ heading }),
}));
