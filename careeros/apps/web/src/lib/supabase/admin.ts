import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseAuthReady } from "@/lib/supabase/env";

export { isSupabaseAuthReady };

export function isSupabaseConfigured() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return isSupabaseAuthReady() && Boolean(serviceKey);
}

export function getServiceSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when Supabase is configured");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAnonSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
