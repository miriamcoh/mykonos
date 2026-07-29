import type { CloudAdapter } from "./types";
import { localAdapter } from "./localAdapter";
import { firebaseAdapter, isFirebaseConfigured } from "./firebaseAdapter";
import { supabaseAdapter, isSupabaseConfigured } from "./supabaseAdapter";

// Single switch that decides which backend the ENTIRE app (data + file
// storage for the gallery/documents) talks to. Default is "local" so the app
// works fully offline with zero setup; set VITE_BACKEND to go live with real
// cloud sync + a real storage bucket (required once the gallery holds more
// than a handful of photos - localStorage/IndexedDB is per-device only and
// isn't built to hold thousands of images):
//   - VITE_BACKEND=supabase   -> Supabase (Postgres + Realtime + Storage)
//   - VITE_BACKEND=firebase   -> Firebase (Firestore + Storage)
//   - VITE_BACKEND=cloud      -> "whichever is configured" - tries Supabase
//                                first, then Firebase. Convenience alias so
//                                CI/env setup doesn't need to know which
//                                provider was actually wired up.
// See .env.example for the required keys per provider.
const rawBackend = (import.meta.env.VITE_BACKEND ?? "local").trim();

// Easy mistake to make: pasting the Supabase project URL into VITE_BACKEND
// itself instead of the literal word "supabase" (and instead of
// VITE_SUPABASE_URL). Without this, that typo silently falls all the way
// through to the local per-device adapter with no indication why nothing
// is syncing - self-correct instead. The URL value itself is recovered in
// supabaseAdapter.ts's own env resolution.
const looksLikeUrl = /^https?:\/\//i.test(rawBackend);
const BACKEND = (looksLikeUrl ? "supabase" : rawBackend) as
  | "local"
  | "firebase"
  | "supabase"
  | "cloud";

if (looksLikeUrl) {
  console.warn(
    `[mykonos] VITE_BACKEND is set to a URL ("${rawBackend}") instead of "supabase" - this looks like ` +
      "the Supabase project URL got pasted into the wrong env var. Treating VITE_BACKEND as \"supabase\" " +
      "for now, but please fix it in Vercel: VITE_BACKEND should be exactly the word supabase, and this " +
      "URL value belongs in VITE_SUPABASE_URL instead."
  );
}

function resolveAdapter(): CloudAdapter {
  if (BACKEND === "firebase" || BACKEND === "cloud") {
    if (isFirebaseConfigured() && BACKEND === "firebase") return firebaseAdapter;
  }
  if (BACKEND === "supabase" || BACKEND === "cloud") {
    if (isSupabaseConfigured()) return supabaseAdapter;
  }
  if (BACKEND === "cloud" && isFirebaseConfigured()) return firebaseAdapter;

  if (BACKEND !== "local") {
    console.warn(
      `[mykonos] VITE_BACKEND=${BACKEND} but no matching provider env vars are set - ` +
        "falling back to the local adapter (per-device only, won't sync across phones or scale to a large gallery). " +
        "See .env.example."
    );
  }
  return localAdapter;
}

export const backend: CloudAdapter = resolveAdapter();

// Lets the UI show girls whether they're actually on shared cloud storage or
// just the local per-device fallback (see components/ui/SyncBadge.tsx) -
// otherwise a misconfigured .env silently degrades to "nothing syncs" with
// no visible signal, which is exactly the bug this is meant to prevent.
export const isCloudBackend = backend.name !== "local";

export type { CloudAdapter, CloudCollection, CloudStorage } from "./types";
