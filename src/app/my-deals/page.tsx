import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import {
  MyDealsClient,
  type EnrichedDeal,
} from "@/components/deals/MyDealsClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealRecord } from "@/types/domain";

export default async function MyDealsPage() {
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
    redirect("/login?next=/my-deals");
  }

  const supabase = await createSupabaseServerClient();
  let enrichedDeals: EnrichedDeal[] = [];

  if (supabase) {
    const { data: dealsData } = await supabase
      .from("deals")
      .select(
        "*, pool:pools(id, pool_code, vehicle_id, origin_name, destination_name, departure_date, departure_time), owner:profiles!deals_owner_id_fkey(id, full_name, business_name), requester:profiles!deals_requester_id_fkey(id, full_name, business_name)",
      )
      .or(`owner_id.eq.${ctx.user.id},requester_id.eq.${ctx.user.id}`)
      .order("confirmed_at", { ascending: false });

    const deals = (dealsData as (DealRecord & { pool?: { vehicle_id?: string } })[]) || [];

    if (deals.length > 0) {
      const counterpartyIds = Array.from(
        new Set(
          deals.map((d) =>
            d.owner_id === ctx.user!.id ? d.requester_id : d.owner_id,
          ),
        ),
      );
      const vehicleIds = Array.from(
        new Set(deals.map((d) => d.pool?.vehicle_id).filter(Boolean) as string[]),
      );
      const dealIds = deals.map((d) => d.id);

      const [{ data: contacts }, { data: vehicles }, { data: txRows }, { data: myReviews }] =
        await Promise.all([
          supabase
            .from("profile_private_contacts")
            .select("user_id, email, mobile_number")
            .in("user_id", counterpartyIds),
          vehicleIds.length > 0
            ? supabase
                .from("vehicles")
                .select("id, registration_number")
                .in("id", vehicleIds)
            : Promise.resolve({ data: [] }),
          supabase
            .from("deal_transactions")
            .select("id, deal_id, event_type, capacity_delta_kg, notes, created_at")
            .in("deal_id", dealIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("reviews")
            .select("deal_id")
            .eq("reviewer_id", ctx.user.id)
            .in("deal_id", dealIds),
        ]);

      enrichedDeals = deals.map((deal) => {
        const partnerId =
          deal.owner_id === ctx.user!.id ? deal.requester_id : deal.owner_id;
        const contact = (contacts || []).find((c) => c.user_id === partnerId);
        const vehicle = (vehicles || []).find(
          (v) => v.id === deal.pool?.vehicle_id,
        );
        const transactions = (txRows || []).filter(
          (t) => t.deal_id === deal.id,
        );
        const hasReviewed = (myReviews || []).some((r) => r.deal_id === deal.id);

        return {
          ...deal,
          counterpartyPhone: contact?.mobile_number ?? null,
          counterpartyEmail: contact?.email ?? null,
          vehicleRegNumber: vehicle?.registration_number ?? null,
          hasReviewed,
          transactions,
        };
      });
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#173D32]">
            My Confirmed Deals
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            View mutually confirmed shipments, unlocked counterparty contact
            details, shipment progress, and verified deal history.
          </p>
        </div>

        <MyDealsClient
          currentUserId={ctx.user.id}
          initialDeals={enrichedDeals}
        />
      </div>
    </AppShell>
  );
}

