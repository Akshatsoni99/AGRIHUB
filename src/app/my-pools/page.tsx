import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import {
  MyPoolsClient,
  type PoolWithCounts,
} from "@/components/pools/MyPoolsClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PoolListing } from "@/types/domain";

export default async function MyPoolsPage() {
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
    redirect("/login?next=/my-pools");
  }

  const supabase = await createSupabaseServerClient();
  let enrichedPools: PoolWithCounts[] = [];

  if (supabase) {
    const [{ data: pools }, { data: reqs }, { data: deals }] = await Promise.all([
      supabase
        .from("pools")
        .select(
          "id, pool_code, vehicle_category, total_capacity_kg, existing_occupied_kg, reserved_capacity_kg, available_capacity_kg, origin_name, destination_name, departure_date, departure_time, asking_price, cargo_description, status",
        )
        .eq("owner_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("pool_requests")
        .select("pool_id, status")
        .eq("pool_owner_id", ctx.user.id)
        .eq("status", "PENDING"),
      supabase
        .from("deals")
        .select("pool_id, status")
        .eq("owner_id", ctx.user.id)
        .neq("status", "CANCELLED"),
    ]);

    const typedPools = (pools as PoolListing[]) || [];
    enrichedPools = typedPools.map((pool) => ({
      ...pool,
      pendingRequestsCount: (reqs || []).filter(
        (r) => r.pool_id === pool.id && r.status === "PENDING",
      ).length,
      confirmedDealsCount: (deals || []).filter((d) => d.pool_id === pool.id)
        .length,
    }));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#173D32]">My Truck Pools</h1>
          <p className="mt-1 text-sm text-[#718078]">
            Monitor published vehicle capacity, incoming join requests, and
            confirmed shared shipments.
          </p>
        </div>

        <MyPoolsClient initialPools={enrichedPools} />
      </div>
    </AppShell>
  );
}

