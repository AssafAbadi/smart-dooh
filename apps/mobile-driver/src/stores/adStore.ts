import { create } from 'zustand';
import type { AdInstruction } from '@smart-dooh/shared-dto';

/** When ad came from ranked (your GPS) vs last (display cache). Lets you confirm location-based ads. */
export type AdSource = 'ranked' | 'last' | null;

export interface AdStoreState {
  instructions: AdInstruction[];
  /** 'ranked' = from your location (GET ranked); 'last' = from display cache (GET last). */
  adSource: AdSource;
  setInstructions: (instructions: AdInstruction[], source?: AdSource) => void;
  clear: () => void;
  refreshTrigger: number;
  requestRefresh: () => void;
}

export const useAdStore = create<AdStoreState>((set) => ({
  instructions: [],
  adSource: null,
  setInstructions: (instructions, source = null) => set({ instructions, adSource: source }),
  clear: () => set({ instructions: [], adSource: null }),
  requestRefresh: () => set((s) => ({ refreshTrigger: (s.refreshTrigger ?? 0) + 1 })),
}));
