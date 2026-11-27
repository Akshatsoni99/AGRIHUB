import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { MyRequestsClient } from "@/components/pools/MyRequestsClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PoolRequest } from "@/types/domain";

export default async function MyRequestsPage() {
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
    redirect("/login?next=/my-requests");
  }

  const supabase = await createSupabaseServerClient();
  let requests: PoolRequest[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("pool_requests")
      .select(
        "*, pool:pools(id, pool_code, origin_name, destination_name, departure_date, departure_time), pool_owner:profiles!pool_requests_pool_owner_id_fkey(id, full_name, business_name)",
      )
      .eq("requester_id", ctx.user.id)
      .order("created_at", { ascending: false });

    requests = (data as PoolRequest[]) || [];
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#173D32]">
            My Shipment Requests
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            Track outgoing requests to join truck pools and continue price and
            pickup negotiations.
          </p>
        </div>

        <MyRequestsClient initialRequests={requests} />
      </div>
    </AppShell>
  );
}

