import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    throw new Error("Supabase URL and anon key are required for auth");
  }
  return createBrowserClient(url, anon);
}
