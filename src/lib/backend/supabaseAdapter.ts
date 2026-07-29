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
// Safety net for cross-device sync: some Supabase projects have Realtime
// silently misconfigured (RLS/publication/replication issues that don't
// surface as a clean client-side error). Realtime is still the fast path
// when it works, but polling guarantees "User B eventually sees User A's
// change" even if the realtime channel never fires a single event.
const POLL_INTERVAL_MS = 5_000;

let client: SupabaseClient | null = null;
let cachedBaseUrl: string | null = null;

/**
 * supabase-js appends /rest/v1, /realtime/v1, /storage/v1 itself - it
 * expects the bare project URL (https://xxx.supabase.co). Pasting the REST
 * URL shown elsewhere in the Supabase dashboard (which already ends in
 * /rest/v1) is a one-character-looking mistake that's easy to make, and it
 * silently double-prefixes every request instead of failing loudly
 * (.../rest/v1/rest/v1/table, wss://.../rest/v1/realtime/v1/websocket,
 * .../rest/v1//storage/v1/...). Stripping it here means the app works
 * either way instead of depending on getting the env var exactly right.
 */
function sanitizeSupabaseUrl(raw: string): string {
  let cleaned = raw
    .trim()
    .replace(/\/+$/, "") // trailing slash(es)
    .replace(/\/(rest|realtime|storage)\/v1$/i, ""); // accidental API suffix

  // Copying just the "xxxxx.supabase.co" part (no scheme) is another easy
  // mistake - createClient() throws "Invalid supabaseUrl" and crashes with
  // nothing on screen if this isn't caught, so recover instead of failing.
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  if (cleaned !== raw.trim()) {
    console.warn(
      `[mykonos] VITE_SUPABASE_URL looked malformed ("${raw}") - using "${cleaned}" instead. ` +
        "Fix the env var to just the project URL (https://xxxxx.supabase.co) to silence this warning."
    );
  }
  return cleaned;
}

// A real Supabase project URL is always some-ref.supabase.co (or a custom
// domain) - i.e. it has a dot in it. Values like the bare word "supabase"
// (which happened in practice: someone put the VITE_BACKEND value into the
// VITE_SUPABASE_URL field instead) have nowhere to go but a guaranteed
// ERR_NAME_NOT_RESOLVED loop if treated as a real host. Reject those
// outright instead of dutifully turning them into "https://supabase" and
// hammering a hostname that can never exist.
const RESERVED_BACKEND_WORDS = new Set(["local", "firebase", "supabase", "cloud"]);

function isPlausibleSupabaseUrlValue(candidate: string): boolean {
  if (!candidate) return false;
  const stripped = candidate.replace(/^https?:\/\//i, "").toLowerCase();
  if (RESERVED_BACKEND_WORDS.has(stripped)) return false;
  return stripped.includes("."); // every real Supabase host has a dot
}

/**
 * Recovers from a real-world misconfiguration: the Supabase project URL
 * pasted into VITE_BACKEND instead of VITE_SUPABASE_URL (index.ts already
 * treats VITE_BACKEND as "supabase" in that case, but the URL itself still
 * needs to come from somewhere since VITE_SUPABASE_URL is empty).
 */
function rawSupabaseUrlEnv(): string {
  const primary = ((import.meta.env.VITE_SUPABASE_URL as string) ?? "").trim();
  if (isPlausibleSupabaseUrlValue(primary)) return primary;
  if (primary) {
    console.error(
      `[mykonos] VITE_SUPABASE_URL is set to "${primary}", which isn't a real Supabase project URL ` +
        '(it should look like "https://xxxxx.supabase.co") - treating it as not configured instead of ' +
        "endlessly trying to reach a host that can't possibly exist. Fix the value in Vercel."
    );
  }
  const backendVal = ((import.meta.env.VITE_BACKEND as string) ?? "").trim();
  if (isPlausibleSupabaseUrlValue(backendVal)) return backendVal;
  return "";
}

function getBaseUrl(): string {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = sanitizeSupabaseUrl(rawSupabaseUrlEnv());
  }
  return cachedBaseUrl;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(rawSupabaseUrlEnv() && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(getBaseUrl(), import.meta.env.VITE_SUPABASE_ANON_KEY as string);
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
            // Not fatal: the poll below still keeps this table in sync.
            console.error(
              `[mykonos] Supabase realtime subscription problem on "${table}": ${status}`,
              err
            );
          }
        });

      const pollId = window.setInterval(load, POLL_INTERVAL_MS);

      const unsub: Unsubscribe = () => {
        cancelled = true;
        window.clearInterval(pollId);
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

/**
 * Supabase Storage keys must be valid S3-style object keys - non-ASCII
 * characters (Hebrew filenames like "הורדה.jfif" being the exact case QA
 * hit) get rejected with HTTP 400 "Invalid key". The original filename is
 * never needed for the storage key itself (every caller keeps the
 * human-readable name in a separate `name`/`fileName` field on the record
 * for display), so the key is just a random id + a sanitized extension.
 */
function safeStorageFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const rawExt = dot > -1 ? originalName.slice(dot + 1) : "";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10);
  const id = crypto.randomUUID();
  return ext ? `${id}.${ext}` : id;
}

const storage: CloudStorage = {
  async upload(folder, file, fileName, onProgress) {
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const path = `${folder}/${safeStorageFileName(fileName)}`;
    const uploadUrl = `${getBaseUrl()}/storage/v1/object/${BUCKET}/${path}`;

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
