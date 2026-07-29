import { create } from "zustand";
import type { AppUser, GirlName } from "@/types";

const STORAGE_KEY = "mykonos:auth";

interface AuthState {
  user: AppUser | null;
  login: (name: GirlName) => void;
  logout: () => void;
}

function loadUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  login: (name) => {
    const user: AppUser = { name, loggedInAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null });
  },
}));
