import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/types/domain";

export default async function NotificationsPage() {
  const ctx = await getCurrentUserContext();

  if (!ctx.isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  if (!ctx.user) {
    redirect("/login?next=/notifications");
  }

  const supabase = await createSupabaseServerClient();
  let items: NotificationItem[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    items = (data as NotificationItem[]) || [];
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#173D32]">Notifications</h1>
          <p className="mt-1 text-sm text-[#718078]">
            Stay updated on join requests, negotiation proposals, confirmed
            deals, and pool capacity changes.
          </p>
        </div>

        <NotificationsClient userId={ctx.user.id} initialItems={items} />
      </div>
    </AppShell>
  );
}

