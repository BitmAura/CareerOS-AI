function trim(value: string | undefined) {
  return (value || "").trim();
}

/** Vercel Supabase integration uses SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY. */
export function getSupabaseUrl() {
  return (
    trim(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    trim(process.env.SUPABASE_URL) ||
    ""
  );
}

export function getSupabaseAnonKey() {
  return (
    trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    trim(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    trim(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    ""
  );
}

export function getSupabaseServiceKey() {
  return (
    trim(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    trim(process.env.SUPABASE_SECRET_KEY) ||
    ""
  );
}

export function isSupabaseAuthReady() {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  return Boolean(url && anon && !url.includes("your-project") && !url.includes("xxxx"));
}
