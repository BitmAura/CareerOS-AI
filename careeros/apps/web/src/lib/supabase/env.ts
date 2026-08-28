export function isSupabaseAuthReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return Boolean(url && anon && !url.includes("your-project") && !url.includes("xxxx"));
}
