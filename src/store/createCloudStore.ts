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
      await col.add(item);
    },
    update: async (id, patch) => {
      await col.update(id, patch);
    },
    remove: async (id) => {
      await col.remove(id);
    },
  }));
}
