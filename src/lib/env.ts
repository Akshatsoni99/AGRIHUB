export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

  return {
    url,
    publishableKey,
    isConfigured: Boolean(url && publishableKey && url.startsWith("http")),
  };
}

export function getGoogleMapsBrowserConfig() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
  return {
    apiKey,
    isConfigured: Boolean(apiKey),
  };
}

export function getGoogleMapsRoutesServerKey() {
  return process.env.GOOGLE_MAPS_ROUTES_API_KEY?.trim() || "";
}

