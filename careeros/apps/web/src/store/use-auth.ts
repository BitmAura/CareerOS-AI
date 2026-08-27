import { create } from "zustand";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/lib/auth/keys";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: "starter" | "professional" | "premium" | "concierge" | "pro" | string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,
  setSession: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      localStorage.removeItem("token");
      document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
    set({ user, token, isAuthenticated: true, hydrated: true });
  },
  setUser: (user) => {
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
    set({ user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem("token");
      document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
    set({ user: null, token: null, isAuthenticated: false, hydrated: true });
  },
  hydrate: () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }
    const legacy = localStorage.getItem("token");
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || legacy;
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (legacy && !localStorage.getItem(AUTH_TOKEN_KEY)) {
      localStorage.setItem(AUTH_TOKEN_KEY, legacy);
      localStorage.removeItem("token");
    }
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        set({ user, token, isAuthenticated: true, hydrated: true });
        return;
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem("token");
      }
    }
    set({ hydrated: true });
  },
}));
