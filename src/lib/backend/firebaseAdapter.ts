// Real Firebase adapter (Firestore realtime sync + Storage for photos/docs).
// It implements the exact same `CloudAdapter` contract as the local adapter,
// so switching the whole app to Firebase is just flipping VITE_BACKEND=firebase
// in `.env` once the config values below are filled in - no component or
// store code needs to change.
//
// Setup:
//   1. npm i firebase   (already in package.json)
//   2. Create a Firebase project -> enable Firestore + Storage.
//   3. Copy the web app config into `.env` (see `.env.example`).
//   4. Set VITE_BACKEND=firebase
//   5. Firestore rules: allow read/write to signed-in-less "girls" collection
//      (this is a small private trip app; lock it down with a shared secret
//      or Firebase Auth anonymous sign-in if you want extra safety).

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  addDoc,
  collection as fsCollection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from "firebase/storage";
import type {
  CloudAdapter,
  CloudCollection,
  CloudStorage,
  Unsubscribe,
  WithId,
} from "./types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let fbStorage: FirebaseStorage | null = null;

function ensureInit() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    fbStorage = getStorage(app);
  }
}

function makeCollection<T extends WithId>(name: string): CloudCollection<T> {
  return {
    subscribe(onChange) {
      ensureInit();
      const colRef = fsCollection(db!, name);
      const unsub = onSnapshot(colRef, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
        onChange(items);
      });
      const u: Unsubscribe = () => unsub();
      return u;
    },
    async getAll() {
      ensureInit();
      const snap = await getDocs(fsCollection(db!, name));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    },
    async add(item) {
      ensureInit();
      // Use setDoc with the item's own id so local + firebase ids match.
      await setDoc(doc(db!, name, item.id), item as Record<string, unknown>);
    },
    async update(id, patch) {
      ensureInit();
      await updateDoc(doc(db!, name, id), patch as Record<string, unknown>);
    },
    async remove(id) {
      ensureInit();
      await deleteDoc(doc(db!, name, id));
    },
    async set(items) {
      ensureInit();
      const batch = writeBatch(db!);
      items.forEach((it) => batch.set(doc(db!, name, it.id), it as Record<string, unknown>));
      await batch.commit();
    },
  };
}

const storage: CloudStorage = {
  upload(folder, file, fileName, onProgress) {
    ensureInit();
    const path = `${folder}/${Date.now()}-${fileName}`;
    const storageRef = ref(fbStorage!, path);
    const task = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress?.(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path });
        }
      );
    });
  },
  async remove(path) {
    ensureInit();
    await deleteObject(ref(fbStorage!, path));
  },
  async download(url, fileName) {
    // Firebase Storage URLs are cross-origin, so we fetch -> blob -> save,
    // same UX as the local adapter (works for "download to device" on mobile).
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

export const firebaseAdapter: CloudAdapter = {
  name: "firebase",
  collection: makeCollection,
  storage,
};
