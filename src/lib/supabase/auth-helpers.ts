import { cache } from "react";
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

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, business_name, city, state, account_type, avatar_url, verification_status, is_admin, is_suspended, onboarding_completed, created_at";

const getRequestAuthUser = cache(async () => {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSessionCookie) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { id: user.id, email: user.email };
});

const getRequestProfileAndUnread = cache(async (userId: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { profile: null, unreadNotifications: 0 };
  }

  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  return {
    profile: (profile as PublicProfile | null) ?? null,
    unreadNotifications: unreadCount ?? 0,
  };
});

const getRequestPrivateContact = cache(async (userId: string) => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("profile_private_contacts")
    .select("user_id, email, mobile_number")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as PrivateContact | null) ?? null;
});

export async function getCurrentUserContext(options?: {
  includePrivateContact?: boolean;
}): Promise<CurrentUserContext> {
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

  const user = await getRequestAuthUser();
  if (!user) {
    return {
      isConfigured: true,
      user: null,
      profile: null,
      privateContact: null,
      unreadNotifications: 0,
    };
  }

  const includePrivateContact = options?.includePrivateContact ?? false;

  const [{ profile, unreadNotifications }, privateContact] = await Promise.all([
    getRequestProfileAndUnread(user.id),
    includePrivateContact
      ? getRequestPrivateContact(user.id)
      : Promise.resolve(null),
  ]);

  return {
    isConfigured: true,
    user,
    profile,
    privateContact,
    unreadNotifications,
  };
}

