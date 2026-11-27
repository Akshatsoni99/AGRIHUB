import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

let browserClient: SupabaseClient | null = null;
let cachedConfigKey = "";

export function createSupabaseBrowserClient() {
  const { url, publishableKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return null;
  }

  const configKey = `${url}::${publishableKey}`;
  if (typeof window !== "undefined" && browserClient && cachedConfigKey === configKey) {
    return browserClient;
  }

  const client = createBrowserClient(url, publishableKey);
  if (typeof window !== "undefined") {
    browserClient = client;
    cachedConfigKey = configKey;
  }
  return client;
}

