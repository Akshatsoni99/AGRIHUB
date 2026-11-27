import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import {
  MarketplaceClient,
  type ProduceListingItem,
} from "@/components/marketplace/MarketplaceClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MarketplacePage() {
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

  const supabase = await createSupabaseServerClient();
  let listings: ProduceListingItem[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("produce_listings")
      .select(
        "*, seller:profiles!produce_listings_seller_id_fkey(id, full_name, business_name, city)",
      )
      .eq("status", "ACTIVE")
      .order("ready_date", { ascending: true })
      .limit(50);

    listings = (data as ProduceListingItem[]) || [];
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <MarketplaceClient
          currentUserId={ctx.user?.id ?? null}
          initialListings={listings}
        />
      </div>
    </AppShell>
  );
}

