import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import type { PrivateContact, PublicProfile } from "@/types/domain";

export interface CurrentUserContext {
  isConfigured: boolean;
  user: { id: string; email?: string } | null;
  profile: PublicProfile | null;
  privateContact: PrivateContact | null;
  unreadNotifications: number;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  // Opt into per-request dynamic rendering so session state and env configuration are never cached statically.
  await cookies();

  const { isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      isConfigured: false,
      user: null,
      profile: null,
      privateContact: null,
      unreadNotifications: 0,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      isConfigured: false,
      user: null,
      profile: null,
      privateContact: null,
      unreadNotifications: 0,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isConfigured: true,
      user: null,
      profile: null,
      privateContact: null,
      unreadNotifications: 0,
    };
  }

  const [{ data: profile }, { data: privateContact }, { count: unreadCount }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("profile_private_contacts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

  return {
    isConfigured: true,
    user: { id: user.id, email: user.email },
    profile: (profile as PublicProfile | null) ?? null,
    privateContact: (privateContact as PrivateContact | null) ?? null,
    unreadNotifications: unreadCount ?? 0,
  };
}

