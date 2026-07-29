import type { CloudAdapter } from "./types";
import { localAdapter } from "./localAdapter";
import { firebaseAdapter, isFirebaseConfigured } from "./firebaseAdapter";
import { supabaseAdapter, isSupabaseConfigured } from "./supabaseAdapter";

// Single switch that decides which backend the ENTIRE app talks to.
// Default is "local" so the app works fully offline with zero setup tonight;
// set VITE_BACKEND=firebase or VITE_BACKEND=supabase (+ the matching env
// vars in .env, see .env.example) to go live with real cloud sync.
const BACKEND = (import.meta.env.VITE_BACKEND ?? "local") as
  | "local"
  | "firebase"
  | "supabase";

function resolveAdapter(): CloudAdapter {
  if (BACKEND === "firebase") {
    if (isFirebaseConfigured()) return firebaseAdapter;
    console.warn(
      "[mykonos] VITE_BACKEND=firebase but Firebase env vars are missing - falling back to local adapter."
    );
  }
  if (BACKEND === "supabase") {
    if (isSupabaseConfigured()) return supabaseAdapter;
    console.warn(
      "[mykonos] VITE_BACKEND=supabase but Supabase env vars are missing - falling back to local adapter."
    );
  }
  return localAdapter;
}

export const backend: CloudAdapter = resolveAdapter();
export type { CloudAdapter, CloudCollection, CloudStorage } from "./types";
