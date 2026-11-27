import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return null;
  }
  return createBrowserClient(url, publishableKey);
}

