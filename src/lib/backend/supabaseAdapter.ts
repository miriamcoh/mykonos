// Real Supabase adapter (Postgres + Realtime for sync, Storage bucket for files).
// Same `CloudAdapter` contract as local/firebase - flip VITE_BACKEND=supabase
// once configured and nothing else in the app changes.
//
// Setup:
//   1. npm i @supabase/supabase-js
//   2. Create a Supabase project. For each collection used by the app
//      (itineraryEvents, expenses, documents, locationPings, checklistItems,
//      galleryPhotos, polls) create a table with an `id text primary key`
//      column plus a `data jsonb` column (simplest schema-less approach), or
//      model proper columns if you prefer strong typing.
//   3. Enable Realtime replication on those tables.
//   4. Create a public Storage bucket named "mykonos-files".
//   5. Copy the project URL + anon key into `.env` (see `.env.example`).
//   6. Set VITE_BACKEND=supabase

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CloudAdapter,
  CloudCollection,
  CloudStorage,
  Unsubscribe,
  WithId,
} from "./types";

const BUCKET = "mykonos-files";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}

// Schema-less table shape: { id: text primary key, data: jsonb }
function makeCollection<T extends WithId>(name: string): CloudCollection<T> {
  const table = name;

  return {
    subscribe(onChange) {
      const sb = getClient();
      let cancelled = false;

      const load = async () => {
        const { data } = await sb.from(table).select("id, data");
        if (!cancelled && data) {
          onChange(data.map((row) => row.data as T));
        }
      };
      load();

      const channel = sb
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => load()
        )
        .subscribe();

      const unsub: Unsubscribe = () => {
        cancelled = true;
        sb.removeChannel(channel);
      };
      return unsub;
    },
    async getAll() {
      const sb = getClient();
      const { data } = await sb.from(table).select("id, data");
      return (data ?? []).map((row) => row.data as T);
    },
    async add(item) {
      const sb = getClient();
      await sb.from(table).insert({ id: item.id, data: item });
    },
    async update(id, patch) {
      const sb = getClient();
      const { data: existing } = await sb
        .from(table)
        .select("data")
        .eq("id", id)
        .single();
      const merged = { ...(existing?.data ?? {}), ...patch };
      await sb.from(table).update({ data: merged }).eq("id", id);
    },
    async remove(id) {
      const sb = getClient();
      await sb.from(table).delete().eq("id", id);
    },
    async set(items) {
      const sb = getClient();
      await sb
        .from(table)
        .upsert(items.map((it) => ({ id: it.id, data: it })));
    },
  };
}

const storage: CloudStorage = {
  async upload(folder, file, fileName, onProgress) {
    const sb = getClient();
    const path = `${folder}/${Date.now()}-${fileName}`;
    onProgress?.(20);
    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    onProgress?.(90);
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    onProgress?.(100);
    return { url: data.publicUrl, path };
  },
  async remove(path) {
    const sb = getClient();
    await sb.storage.from(BUCKET).remove([path]);
  },
  async download(url, fileName) {
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

export const supabaseAdapter: CloudAdapter = {
  name: "supabase",
  collection: makeCollection,
  storage,
};
