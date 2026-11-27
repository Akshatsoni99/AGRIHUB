import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TruckPoolHubClient } from "@/components/pools/TruckPoolHubClient";
import { PoolCard } from "@/components/pools/PoolCard";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import type { PoolListing } from "@/types/domain";
import { Truck } from "lucide-react";

export default async function TruckPoolPage() {
  const { isConfigured } = getSupabaseConfig();
  let recentOpenPools: PoolListing[] = [];

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("pools")
        .select(
          "*, owner:profiles!pools_owner_id_fkey(id, full_name, business_name, city, state, verification_status), stops:pool_stops(*)",
        )
        .eq("status", "OPEN")
        .gt("available_capacity_kg", 0)
        .order("departure_date", { ascending: true })
        .limit(6);

      recentOpenPools = (data as PoolListing[]) || [];
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <TruckPoolHubClient />

        {!isConfigured ? (
          <SetupBanner />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#242B31]">
                  Latest Open Truck Pools
                </h2>
                <p className="text-xs text-[#718078]">
                  Live shared transport corridors currently accepting capacity
                  requests.
                </p>
              </div>
              <Link
                href="/truck-pool/find"
                className="text-xs font-semibold text-[#173D32] hover:underline"
              >
                Open full search & filters →
              </Link>
            </div>

            {recentOpenPools.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No open pools published yet"
                description="Be the first operator on your corridor to list available cargo capacity and start pooling shipments."
                actionLabel="Create First Pool"
                actionHref="/truck-pool/create"
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {recentOpenPools.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

