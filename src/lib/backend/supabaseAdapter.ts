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

function logSupabaseError(op: string, table: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(
    `[mykonos] Supabase ${op} failed on "${table}":`,
    (error as { message?: string })?.message ?? error,
    error
  );
}

// Schema-less table shape: { id: text primary key, data: jsonb }
function makeCollection<T extends WithId>(name: string): CloudCollection<T> {
  const table = name;

  return {
    subscribe(onChange) {
      const sb = getClient();
      let cancelled = false;

      const load = async () => {
        const { data, error } = await sb.from(table).select("id, data");
        if (error) {
          logSupabaseError("select", table, error);
          return;
        }
        if (!cancelled) onChange((data ?? []).map((row) => row.data as T));
      };
      load();

      const channel = sb
        .channel(`realtime:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => load())
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || err) {
            // Usually means Realtime isn't enabled for this table - run
            // supabase-setup.sql (alter publication supabase_realtime add table ...).
            console.error(
              `[mykonos] Supabase realtime subscription problem on "${table}": ${status}`,
              err
            );
          }
        });

      const unsub: Unsubscribe = () => {
        cancelled = true;
        sb.removeChannel(channel);
      };
      return unsub;
    },
    async getAll() {
      const sb = getClient();
      const { data, error } = await sb.from(table).select("id, data");
      if (error) {
        logSupabaseError("select", table, error);
        throw error;
      }
      return (data ?? []).map((row) => row.data as T);
    },
    async add(item) {
      const sb = getClient();
      const { error } = await sb.from(table).insert({ id: item.id, data: item });
      if (error) {
        logSupabaseError("insert", table, error);
        throw error;
      }
    },
    async update(id, patch) {
      const sb = getClient();
      const { data: existing, error: selectError } = await sb
        .from(table)
        .select("data")
        .eq("id", id)
        .single();
      if (selectError) {
        logSupabaseError("select-before-update", table, selectError);
        throw selectError;
      }
      const merged = { ...(existing?.data ?? {}), ...patch };
      const { error } = await sb.from(table).update({ data: merged }).eq("id", id);
      if (error) {
        logSupabaseError("update", table, error);
        throw error;
      }
    },
    async remove(id) {
      const sb = getClient();
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) {
        logSupabaseError("delete", table, error);
        throw error;
      }
    },
    async set(items) {
      const sb = getClient();
      const { error } = await sb
        .from(table)
        .upsert(items.map((it) => ({ id: it.id, data: it })));
      if (error) {
        logSupabaseError("upsert", table, error);
        throw error;
      }
    },
  };
}

// Raw XHR straight to the Storage REST endpoint instead of the supabase-js
// helper: the SDK's `.upload()` gives no progress events and - critically -
// no timeout, so a stalled connection or an RLS/CORS problem that doesn't
// error cleanly leaves the caller awaiting a promise that never settles
// (this was the exact cause of uploads freezing at 20%: onProgress(20) fires
// once before the await, then nothing - success, failure, and "hung
// forever" were all indistinguishable). XHR gives real byte-level progress
// via upload.onprogress and a hard timeout that guarantees rejection.
const UPLOAD_TIMEOUT_MS = 60_000;

function xhrUpload(
  url: string,
  file: File | Blob,
  apiKey: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 90));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        console.error(
          `[mykonos] Supabase storage upload failed: HTTP ${xhr.status}`,
          xhr.responseText
        );
        reject(
          new Error(
            xhr.status === 404
              ? `Bucket "${BUCKET}" לא נמצא - הריצו את supabase-setup.sql`
              : xhr.status === 403 || xhr.status === 401
              ? "אין הרשאה להעלות (RLS) - הריצו את supabase-setup.sql"
              : `העלאה נכשלה (HTTP ${xhr.status})`
          )
        );
      }
    };
    xhr.onerror = () => {
      console.error("[mykonos] Supabase storage upload network error", url);
      reject(new Error("שגיאת רשת בהעלאה - בדקו את החיבור לאינטרנט"));
    };
    xhr.ontimeout = () => {
      console.error("[mykonos] Supabase storage upload timed out", url);
      reject(new Error("ההעלאה נתקעה (timeout) - נסו שוב או קובץ קטן יותר"));
    };
    xhr.send(file);
  });
}

const storage: CloudStorage = {
  async upload(folder, file, fileName, onProgress) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const path = `${folder}/${Date.now()}-${fileName}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`;

    await xhrUpload(uploadUrl, file, apiKey, onProgress);
    onProgress?.(100);

    const sb = getClient();
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  },
  async remove(path) {
    const sb = getClient();
    const { error } = await sb.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error("[mykonos] Supabase storage remove failed:", error.message, error);
      throw error;
    }
  },
  async download(url, fileName) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[mykonos] Download failed: HTTP ${res.status}`, url);
      throw new Error(`ההורדה נכשלה (HTTP ${res.status})`);
    }
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
