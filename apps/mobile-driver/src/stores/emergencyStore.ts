import { create } from 'zustand';

export interface ShelterInfo {
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  bearingDegrees: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface EmergencyState {
  isAlertActive: boolean;
  shelter: ShelterInfo | null;
  alertHeadline: string | null;
  alertTimestamp: number | null;
  setAlert: (shelter: ShelterInfo, headline: string) => void;
  clearAlert: () => void;
  updateShelterDistance: (distanceMeters: number, bearingDegrees: number, direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  isAlertActive: false,
  shelter: null,
  alertHeadline: null,
  alertTimestamp: null,

  setAlert: (shelter, headline) =>
    set({
      isAlertActive: true,
      shelter,
      alertHeadline: headline,
      alertTimestamp: Date.now(),
    }),

  clearAlert: () =>
    set({
      isAlertActive: false,
      shelter: null,
      alertHeadline: null,
      alertTimestamp: null,
    }),

  updateShelterDistance: (distanceMeters, bearingDegrees, direction) =>
    set((state) => {
      if (!state.shelter) return state;
      return { shelter: { ...state.shelter, distanceMeters, bearingDegrees, direction } };
    }),
}));
