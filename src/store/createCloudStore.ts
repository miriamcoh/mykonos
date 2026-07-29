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

  return create<CloudStoreState<T>>((set, get) => ({
    items: [],
    loading: true,
    init: () => {
      if (initialized) return;
      initialized = true;
      col.subscribe((items) => set({ items, loading: false }));
    },
    // Optimistic: the local list updates immediately, before the network
    // round-trip resolves. Previously this only updated after realtime
    // reflected the write back - meaning if realtime was even briefly
    // unavailable, the person who just added the item saw nothing at all.
    // The eventual subscribe() snapshot still arrives and replaces `items`
    // wholesale with server truth, so this never causes duplicates - it
    // only removes the "wait for round-trip" delay/dependency.
    add: async (item) => {
      set((state) => ({ items: [...state.items, item] }));
      try {
        await col.add(item);
      } catch (err) {
        set((state) => ({ items: state.items.filter((i) => i.id !== item.id) }));
        console.error(`[mykonos] "${collectionName}" add failed:`, err);
        throw err;
      }
    },
    update: async (id, patch) => {
      const prevItems = get().items;
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
      try {
        await col.update(id, patch);
      } catch (err) {
        set({ items: prevItems });
        console.error(`[mykonos] "${collectionName}" update failed:`, err);
        throw err;
      }
    },
    remove: async (id) => {
      const prevItems = get().items;
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      try {
        await col.remove(id);
      } catch (err) {
        set({ items: prevItems });
        console.error(`[mykonos] "${collectionName}" remove failed:`, err);
        throw err;
      }
    },
  }));
}
