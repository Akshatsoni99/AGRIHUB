export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

  return {
    url,
    publishableKey,
    isConfigured: Boolean(url && publishableKey && url.startsWith("http")),
  };
}
