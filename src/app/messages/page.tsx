import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { MessagesWorkspace } from "@/components/chat/MessagesWorkspace";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Conversation } from "@/types/domain";

export default async function MessagesPage() {
  const ctx = await getCurrentUserContext();

  if (!ctx.isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  if (!ctx.user) {
    redirect("/login?next=/messages");
  }

  const supabase = await createSupabaseServerClient();
  let conversations: Conversation[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("conversations")
      .select(
        "*, pool:pools(id, pool_code, origin_name, destination_name, departure_date), request:pool_requests(*), owner:profiles!conversations_owner_id_fkey(id, full_name, business_name), requester:profiles!conversations_requester_id_fkey(id, full_name, business_name)",
      )
      .or(`owner_id.eq.${ctx.user.id},requester_id.eq.${ctx.user.id}`)
      .order("last_message_at", { ascending: false });

    conversations = (data as Conversation[]) || [];
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#173D32]">
            Private Negotiation Messages
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            Coordinate pickup points, cargo handling, and final contributions
            before locking vehicle capacity.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="agri-card h-[540px] animate-pulse bg-white" />
          }
        >
          <MessagesWorkspace
            currentUserId={ctx.user.id}
            initialConversations={conversations}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}

