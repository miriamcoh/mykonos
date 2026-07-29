// Zero-config backend: localStorage for documents + IndexedDB for file blobs,
// synced live across tabs/devices-on-same-browser-profile via BroadcastChannel.
// This is what the app runs on out of the box (no signup needed the night
// before a flight) and it implements the exact same `CloudAdapter` contract
// that the Firebase/Supabase adapters do.

import { v4 as uuid } from "uuid";
import type {
  CloudAdapter,
  CloudCollection,
  CloudStorage,
  Unsubscribe,
  WithId,
} from "./types";
import { idbDelete, idbGet, idbPut } from "./idb";

const PREFIX = "mykonos:";
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("mykonos-sync")
    : null;

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function notify(name: string) {
  listeners.get(name)?.forEach((l) => l());
  channel?.postMessage({ type: "changed", collection: name });
}

channel?.addEventListener("message", (ev) => {
  if (ev.data?.type === "changed") {
    listeners.get(ev.data.collection)?.forEach((l) => l());
  }
});

// Also react to other tabs writing localStorage directly (extra safety net).
window.addEventListener?.("storage", (ev) => {
  if (!ev.key?.startsWith(PREFIX)) return;
  const name = ev.key.slice(PREFIX.length);
  listeners.get(name)?.forEach((l) => l());
});

function readAll<T>(name: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeAll<T>(name: string, items: T[]) {
  localStorage.setItem(PREFIX + name, JSON.stringify(items));
  notify(name);
}

function makeCollection<T extends WithId>(name: string): CloudCollection<T> {
  return {
    subscribe(onChange) {
      const fire = () => onChange(readAll<T>(name));
      fire();
      const set = listeners.get(name) ?? new Set<Listener>();
      set.add(fire);
      listeners.set(name, set);
      const unsub: Unsubscribe = () => {
        listeners.get(name)?.delete(fire);
      };
      return unsub;
    },
    async getAll() {
      return readAll<T>(name);
    },
    async add(item) {
      const items = readAll<T>(name);
      items.push(item);
      writeAll(name, items);
    },
    async update(id, patch) {
      const items = readAll<T>(name).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      );
      writeAll(name, items);
    },
    async remove(id) {
      const items = readAll<T>(name).filter((it) => it.id !== id);
      writeAll(name, items);
    },
    async set(items) {
      writeAll(name, items);
    },
  };
}

const storage: CloudStorage = {
  async upload(folder, file, fileName, onProgress) {
    const path = `${folder}/${uuid()}-${fileName}`;
    onProgress?.(10);
    const blob = file instanceof Blob ? file : new Blob([file]);
    await idbPut(path, blob);
    onProgress?.(70);
    const url = URL.createObjectURL(blob);
    onProgress?.(100);
    return { url, path };
  },
  async remove(path) {
    await idbDelete(path);
  },
  async download(url, fileName) {
    // Works for both blob: URLs (local) and remote https URLs (once swapped
    // to a real cloud adapter) as long as CORS allows it.
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  },
};

// Re-hydrate object URLs for files that were uploaded in a previous session
// (blob: URLs die on reload). We lazily patch them back in when a collection
// item references a `path` but its `url` is stale.
export async function rehydrateBlobUrl(path?: string): Promise<string | null> {
  if (!path) return null;
  const blob = await idbGet(path);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export const localAdapter: CloudAdapter = {
  name: "local",
  collection: makeCollection,
  storage,
};
