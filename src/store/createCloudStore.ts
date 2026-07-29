// Generic Zustand store factory backed by a CloudCollection. Every feature
// store (itinerary, expenses, documents, ...) is a thin wrapper around this,
// so add/update/remove/live-sync logic is written exactly once.

import { create } from "zustand";
import { backend } from "@/lib/backend";
import type { WithId } from "@/lib/backend/types";

export interface CloudStoreState<T extends WithId> {
  items: T[];
  loading: boolean;
  init: () => void;
  add: (item: T) => Promise<void>;
  update: (id: string, patch: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createCloudStore<T extends WithId>(collectionName: string) {
  const col = backend.collection<T>(collectionName);
  let initialized = false;

  return create<CloudStoreState<T>>((set) => ({
    items: [],
    loading: true,
    init: () => {
      if (initialized) return;
      initialized = true;
      col.subscribe((items) => set({ items, loading: false }));
    },
    add: async (item) => {
      try {
        await col.add(item);
      } catch (err) {
        console.error(`[mykonos] "${collectionName}" add failed:`, err);
        throw err;
      }
    },
    update: async (id, patch) => {
      try {
        await col.update(id, patch);
      } catch (err) {
        console.error(`[mykonos] "${collectionName}" update failed:`, err);
        throw err;
      }
    },
    remove: async (id) => {
      try {
        await col.remove(id);
      } catch (err) {
        console.error(`[mykonos] "${collectionName}" remove failed:`, err);
        throw err;
      }
    },
  }));
}
