import React, { Suspense } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { FindPoolExplorer } from "@/components/pools/FindPoolExplorer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import type { PoolListing } from "@/types/domain";

export default async function FindPoolPage() {
  const { isConfigured } = getSupabaseConfig();
  let pools: PoolListing[] = [];

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase
        .from("pools")
        .select(
          "*, owner:profiles!pools_owner_id_fkey(id, full_name, business_name, city, state, verification_status), stops:pool_stops(*)",
        )
        .in("status", ["OPEN", "FULL"])
        .order("departure_date", { ascending: true })
        .limit(100);

      pools = (data as PoolListing[]) || [];
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#173D32]">
              Find Available Truck Pool Capacity
            </h1>
            <p className="mt-1 text-sm text-[#718078]">
              Search published cargo vehicles by corridor, intermediate stops,
              required capacity, and cargo compatibility.
            </p>
          </div>
          <Link
            href="/truck-pool/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#244638]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Create Pool
          </Link>
        </div>

        {!isConfigured ? (
          <SetupBanner />
        ) : (
          <Suspense
            fallback={
              <div className="agri-card h-96 animate-pulse bg-white p-6" />
            }
          >
            <FindPoolExplorer initialPools={pools} />
          </Suspense>
        )}
      </div>
    </AppShell>
  );
}

