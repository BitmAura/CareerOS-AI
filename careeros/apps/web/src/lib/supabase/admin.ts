import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceKey,
  getSupabaseUrl,
  isSupabaseAuthReady,
} from "@/lib/supabase/env";

export { isSupabaseAuthReady };

export function isSupabaseConfigured() {
  return isSupabaseAuthReady() && Boolean(getSupabaseServiceKey());
}

export function getServiceSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const serviceKey = getSupabaseServiceKey();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required");
  }
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAnonSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}
