import { create } from 'zustand';

/** When true, drive screen uses position from backend (mock-driver-simulator) instead of GPS/fallback. */
export const useSimulatorStore = create<{
  simulatorMode: boolean;
  setSimulatorMode: (on: boolean) => void;
}>((set) => ({
  simulatorMode: false,
  setSimulatorMode: (simulatorMode) => set({ simulatorMode }),
}));

export const SIMULATOR_DRIVER_ID = 'sim-driver-1';
