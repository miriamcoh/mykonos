// Generic, backend-agnostic data-layer contract.
// Every screen/store talks ONLY to this interface, never to Firebase/Supabase
// directly. That means swapping `local` -> `firebase` -> `supabase` is a
// one-line change in `src/lib/backend/index.ts` and nothing else in the app
// needs to change.

export type Unsubscribe = () => void;

export interface WithId {
  id: string;
}

export interface CloudCollection<T extends WithId> {
  /** Live subscription. Fires immediately with current data, then on every change. */
  subscribe(onChange: (items: T[]) => void): Unsubscribe;
  getAll(): Promise<T[]>;
  add(item: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
  /** Bulk overwrite - used for rare cases like reordering. */
  set(items: T[]): Promise<void>;
}

export interface UploadResult {
  url: string;
  path: string;
}

export interface CloudStorage {
  /** Upload a file/blob to `folder/fileName` and get back a public(ish) url + storage path. */
  upload(
    folder: string,
    file: File | Blob,
    fileName: string,
    onProgress?: (pct: number) => void
  ): Promise<UploadResult>;
  remove(path: string): Promise<void>;
  /** Force-download a file to the user's device (works for cross-origin cloud URLs too). */
  download(url: string, fileName: string): Promise<void>;
}

export interface CloudAdapter {
  name: "local" | "firebase" | "supabase";
  collection<T extends WithId>(name: string): CloudCollection<T>;
  storage: CloudStorage;
}
