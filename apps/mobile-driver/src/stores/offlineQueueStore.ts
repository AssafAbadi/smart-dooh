import { create } from 'zustand';

export interface QueuedImpression {
  client_uuid: string;
  campaignId: string;
  creativeId: string;
  deviceId: string;
  driverId?: string;
  lat: number;
  lng: number;
  geohash: string;
  timestamp: number;
}

export interface OfflineQueueState {
  queue: QueuedImpression[];
  enqueue: (item: Omit<QueuedImpression, 'client_uuid' | 'timestamp'>) => void;
  dequeue: (client_uuid: string) => void;
  getQueue: () => QueuedImpression[];
  clear: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  enqueue: (item) =>
    set((state) => {
      const uuid = `imp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return {
        queue: [
          ...state.queue,
          { ...item, client_uuid: uuid, timestamp: Date.now() },
        ],
      };
    }),
  dequeue: (client_uuid) =>
    set((state) => ({
      queue: state.queue.filter((i) => i.client_uuid !== client_uuid),
    })),
  getQueue: () => get().queue,
  clear: () => set({ queue: [] }),
}));
