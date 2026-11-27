import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Package,
  PlusCircle,
  Search,
  Send,
  Truck,
  Weight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatRelativeTime,
  formatShortDate,
  formatWeight,
} from "@/lib/utils";
import type {
  Conversation,
  DealRecord,
  NotificationItem,
  PoolListing,
  PoolRequest,
} from "@/types/domain";

export default async function DashboardPage() {
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
    redirect("/login?next=/dashboard");
  }

  if (ctx.profile && !ctx.profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const userId = ctx.user.id;

  let myPools: PoolListing[] = [];
  let incomingRequests: PoolRequest[] = [];
  let outgoingRequests: PoolRequest[] = [];
  let myDeals: DealRecord[] = [];
  let recentConversations: Conversation[] = [];
  let recentNotifications: NotificationItem[] = [];

  if (supabase) {
    const [
      poolsRes,
      incomingRes,
      outgoingRes,
      dealsRes,
      convsRes,
      notifRes,
    ] = await Promise.all([
      supabase
        .from("pools")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("pool_requests")
        .select(
          "*, pool:pools(id, pool_code, origin_name, destination_name), requester:profiles!pool_requests_requester_id_fkey(id, full_name, business_name, city)",
        )
        .eq("pool_owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("pool_requests")
        .select(
          "*, pool:pools(id, pool_code, origin_name, destination_name, departure_date)",
        )
        .eq("requester_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("deals")
        .select(
          "*, pool:pools(id, pool_code, origin_name, destination_name, departure_date)",
        )
        .or(`owner_id.eq.${userId},requester_id.eq.${userId}`)
        .order("confirmed_at", { ascending: false })
        .limit(10),
      supabase
        .from("conversations")
        .select(
          "*, pool:pools(id, pool_code, origin_name, destination_name), owner:profiles!conversations_owner_id_fkey(id, full_name), requester:profiles!conversations_requester_id_fkey(id, full_name)",
        )
        .or(`owner_id.eq.${userId},requester_id.eq.${userId}`)
        .order("last_message_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    myPools = (poolsRes.data as PoolListing[]) || [];
    incomingRequests = (incomingRes.data as PoolRequest[]) || [];
    outgoingRequests = (outgoingRes.data as PoolRequest[]) || [];
    myDeals = (dealsRes.data as DealRecord[]) || [];
    recentConversations = (convsRes.data as Conversation[]) || [];
    recentNotifications = (notifRes.data as NotificationItem[]) || [];
  }

  const activePools = myPools.filter((p) => p.status === "OPEN");
  const totalAvailableCapacity = activePools.reduce(
    (sum, p) => sum + p.available_capacity_kg,
    0,
  );
  const pendingIncomingCount = incomingRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const activeOutgoingCount = outgoingRequests.filter((r) =>
    ["PENDING", "ACCEPTED_FOR_DISCUSSION", "NEGOTIATING"].includes(r.status),
  ).length;
  const confirmedDealsCount = myDeals.filter(
    (d) => d.status !== "CANCELLED",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome & Quick CTAs */}
        <div className="agri-card mb-6 flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#173D32]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#173D32]">
                {ctx.profile?.account_type || "both"} Account
              </span>
              {ctx.profile?.city && (
                <span className="text-xs text-[#718078]">
                  {ctx.profile.city}, {ctx.profile.state}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-[#173D32]">
              Welcome back, {ctx.profile?.full_name || "Member"}
            </h1>
            <p className="mt-1 text-sm text-[#718078]">
              {ctx.profile?.business_name
                ? `${ctx.profile.business_name} — `
                : ""}
              Coordinate shared vehicle capacity, active requests, and live deals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/truck-pool/find"
              className="inline-flex items-center gap-2 rounded-lg border border-[#173D32] bg-white px-4 py-2.5 text-sm font-semibold text-[#173D32] transition hover:bg-[#F4F5F1]"
            >
              <Search className="h-4 w-4" />
              Find Pool
            </Link>
            <Link
              href="/truck-pool/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244638]"
            >
              <PlusCircle className="h-4 w-4" />
              Create Pool
            </Link>
          </div>
        </div>

        {/* Live Metric Cards (from database records only) */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/my-pools" className="agri-card p-4 transition hover:border-[#173D32]/40">
            <div className="flex items-center justify-between text-xs font-medium text-[#718078]">
              <span>Active Pools</span>
              <Truck className="h-4 w-4 text-[#173D32]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#242B31]">
              {activePools.length}
            </p>
            <p className="mt-1 text-[11px] text-[#718078]">
              {myPools.length} total listings
            </p>
          </Link>

          <Link href="/my-pools" className="agri-card p-4 transition hover:border-[#173D32]/40">
            <div className="flex items-center justify-between text-xs font-medium text-[#718078]">
              <span>Available Capacity</span>
              <Weight className="h-4 w-4 text-[#D5A45B]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#242B31]">
              {totalAvailableCapacity.toLocaleString("en-IN")} kg
            </p>
            <p className="mt-1 text-[11px] text-[#718078]">
              Across your open pools
            </p>
          </Link>

          <Link href="/my-pools" className="agri-card p-4 transition hover:border-[#173D32]/40">
            <div className="flex items-center justify-between text-xs font-medium text-[#718078]">
              <span>Incoming Requests</span>
              <Inbox className="h-4 w-4 text-[#173D32]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#242B31]">
              {pendingIncomingCount}
            </p>
            <p className="mt-1 text-[11px] text-[#718078]">
              Pending your review
            </p>
          </Link>

          <Link href="/my-requests" className="agri-card p-4 transition hover:border-[#173D32]/40">
            <div className="flex items-center justify-between text-xs font-medium text-[#718078]">
              <span>Outgoing Requests</span>
              <Send className="h-4 w-4 text-[#244638]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#242B31]">
              {activeOutgoingCount}
            </p>
            <p className="mt-1 text-[11px] text-[#718078]">
              Active shipment inquiries
            </p>
          </Link>

          <Link href="/my-deals" className="agri-card p-4 transition hover:border-[#173D32]/40">
            <div className="flex items-center justify-between text-xs font-medium text-[#718078]">
              <span>Confirmed Deals</span>
              <CheckCircle2 className="h-4 w-4 text-[#1F6B48]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#242B31]">
              {confirmedDealsCount}
            </p>
            <p className="mt-1 text-[11px] text-[#718078]">
              Capacity locked & active
            </p>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left 2 cols: Pools / Requests / Deals */}
          <div className="space-y-6 lg:col-span-2">
            {/* Incoming & Outgoing summary */}
            <div className="agri-card p-5">
              <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                  <Package className="h-4 w-4 text-[#173D32]" />
                  Recent Pool Requests
                </h2>
                <Link
                  href="/my-requests"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#173D32] hover:underline"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-[#242B31]">
                    No pool requests yet
                  </p>
                  <p className="mt-1 text-xs text-[#718078]">
                    Find an open truck pool for your shipment or publish your
                    vehicle&apos;s unused space to receive requests.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Link
                      href="/truck-pool/find"
                      className="rounded-lg bg-[#173D32] px-3.5 py-2 text-xs font-semibold text-white"
                    >
                      Find a Pool
                    </Link>
                    <Link
                      href="/truck-pool/create"
                      className="rounded-lg border border-[#E4E8E2] px-3.5 py-2 text-xs font-semibold text-[#242B31]"
                    >
                      Create a Pool
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-[#E4E8E2]">
                  {incomingRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#242B31]">
                          Incoming • {req.requester?.full_name || "Shipper"} wants{" "}
                          {formatWeight(req.required_capacity_kg)}
                        </p>
                        <p className="text-[11px] text-[#718078]">
                          {req.pickup_location} → {req.drop_location} • Proposed{" "}
                          {formatCurrency(req.proposed_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <Link
                          href={`/pools/${req.pool_id}`}
                          className="text-xs font-semibold text-[#173D32] hover:underline"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                  {outgoingRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#242B31]">
                          Outgoing • {req.pool?.origin_name} →{" "}
                          {req.pool?.destination_name}
                        </p>
                        <p className="text-[11px] text-[#718078]">
                          Requested {formatWeight(req.required_capacity_kg)} •{" "}
                          {formatCurrency(req.proposed_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <Link
                          href="/my-requests"
                          className="text-xs font-semibold text-[#173D32] hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmed Deals */}
            <div className="agri-card p-5">
              <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                  <CheckCircle2 className="h-4 w-4 text-[#1F6B48]" />
                  Recent Confirmed Deals
                </h2>
                <Link
                  href="/my-deals"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#173D32] hover:underline"
                >
                  Manage deals <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {myDeals.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#718078]">
                  No confirmed deals yet. Capacity is reserved once both parties
                  confirm identical terms in negotiation chat.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-[#E4E8E2]">
                  {myDeals.slice(0, 4).map((deal) => (
                    <div
                      key={deal.id}
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#173D32]">
                          {deal.deal_code} • {formatWeight(deal.agreed_capacity_kg)}
                        </p>
                        <p className="text-[11px] text-[#718078]">
                          {deal.pickup_point} → {deal.drop_point} •{" "}
                          {deal.pool?.departure_date
                            ? formatShortDate(deal.pool.departure_date)
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#242B31]">
                          {formatCurrency(deal.agreed_price)}
                        </span>
                        <StatusBadge status={deal.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Recent Messages & Recent Activity */}
          <div className="space-y-6">
            <div className="agri-card p-5">
              <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                  <MessageSquare className="h-4 w-4 text-[#173D32]" />
                  Recent Messages
                </h2>
                <Link
                  href="/messages"
                  className="text-xs font-semibold text-[#173D32] hover:underline"
                >
                  Open Inbox
                </Link>
              </div>

              {recentConversations.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#718078]">
                  Private negotiation chats appear here once a pool request is
                  accepted for discussion.
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {recentConversations.map((conv) => {
                    const partner =
                      conv.owner_id === userId ? conv.requester : conv.owner;
                    return (
                      <Link
                        key={conv.id}
                        href={`/messages?conversation=${conv.id}`}
                        className="block rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3 transition hover:border-[#173D32]/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#242B31]">
                            {partner?.full_name || "Counterparty"}
                          </span>
                          <span className="text-[10px] text-[#718078]">
                            {formatRelativeTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-[#718078]">
                          {conv.pool?.pool_code}: {conv.pool?.origin_name} →{" "}
                          {conv.pool?.destination_name}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="agri-card p-5">
              <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                  <Activity className="h-4 w-4 text-[#173D32]" />
                  Recent Activity
                </h2>
                <Link
                  href="/notifications"
                  className="text-xs font-semibold text-[#173D32] hover:underline"
                >
                  All Alerts
                </Link>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#718078]">
                  <Bell className="mx-auto mb-2 h-5 w-5 text-[#718078]" />
                  No recent activity notifications yet.
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {recentNotifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link || "/notifications"}
                      className="block rounded-lg border border-[#E4E8E2] p-3 transition hover:bg-[#F4F5F1]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#242B31]">
                          {item.title}
                        </span>
                        {!item.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#D5A45B]" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-[#718078]">
                        {item.body}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

