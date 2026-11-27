"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Flag,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DealRecord, PoolListing, PublicProfile } from "@/types/domain";
import { formatCurrency, formatShortDate, formatWeight } from "@/lib/utils";
import { toast } from "sonner";

export interface PoolReportItem {
  id: string;
  pool_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "ACTIONED";
  created_at: string;
  pool?: {
    id: string;
    pool_code: string;
    origin_name: string;
    destination_name: string;
    status: string;
  };
}

interface AdminDashboardClientProps {
  currentUserId: string;
  users: PublicProfile[];
  pools: PoolListing[];
  reports: PoolReportItem[];
  deals: DealRecord[];
}

export function AdminDashboardClient({
  currentUserId,
  users,
  pools,
  reports,
  deals,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "pools" | "reports" | "deals">(
    "reports",
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleUserSuspension(user: PublicProfile) {
    if (user.id === currentUserId) {
      toast.error("You cannot suspend your own active admin account.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(user.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: !user.is_suspended })
        .eq("id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        user.is_suspended ? "User account reactivated" : "User account suspended",
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function moderatePool(
    pool: PoolListing,
    action: "flag" | "unflag" | "close",
  ) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(pool.id);
    try {
      const updates =
        action === "close"
          ? { status: "CLOSED", is_flagged: true, moderation_note: "Closed by admin moderation" }
          : action === "flag"
            ? { is_flagged: true, moderation_note: "Flagged for review" }
            : { is_flagged: false, moderation_note: null };

      const { error } = await supabase
        .from("pools")
        .update(updates)
        .eq("id", pool.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Pool ${pool.pool_code} updated`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function resolveReport(
    report: PoolReportItem,
    nextStatus: "REVIEWED" | "DISMISSED" | "ACTIONED",
  ) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(report.id);
    try {
      const { error } = await supabase
        .from("pool_reports")
        .update({ status: nextStatus, resolved_by: currentUserId })
        .eq("id", report.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (nextStatus === "ACTIONED") {
        await supabase
          .from("pools")
          .update({
            status: "CLOSED",
            is_flagged: true,
            moderation_note: `Closed following report: ${report.reason}`,
          })
          .eq("id", report.pool_id);
      }
      toast.success(`Report marked ${nextStatus}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="agri-card p-4">
          <div className="flex items-center justify-between text-xs text-[#718078]">
            <span>Registered Users</span>
            <Users className="h-4 w-4 text-[#173D32]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#242B31]">
            {users.length}
          </p>
        </div>
        <div className="agri-card p-4">
          <div className="flex items-center justify-between text-xs text-[#718078]">
            <span>Total Pool Listings</span>
            <Truck className="h-4 w-4 text-[#173D32]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#242B31]">
            {pools.length}
          </p>
        </div>
        <div className="agri-card p-4">
          <div className="flex items-center justify-between text-xs text-[#718078]">
            <span>Open Reports</span>
            <AlertTriangle className="h-4 w-4 text-[#B83B3B]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#B83B3B]">
            {reports.filter((r) => r.status === "OPEN").length}
          </p>
        </div>
        <div className="agri-card p-4">
          <div className="flex items-center justify-between text-xs text-[#718078]">
            <span>Confirmed Deals</span>
            <CheckCircle2 className="h-4 w-4 text-[#1F6B48]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#242B31]">
            {deals.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E4E8E2] pb-3">
        {[
          { id: "reports", label: `Reported Listings (${reports.length})` },
          { id: "pools", label: `Pool Listings (${pools.length})` },
          { id: "users", label: `Users (${users.length})` },
          { id: "deals", label: `Deals Overview (${deals.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              setTab(item.id as "users" | "pools" | "reports" | "deals")
            }
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              tab === item.id
                ? "bg-[#173D32] text-white"
                : "border border-[#E4E8E2] bg-white text-[#242B31] hover:bg-[#F4F5F1]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Reports Tab */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="agri-card p-8 text-center text-xs text-[#718078]">
              No pool reports submitted.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="agri-card flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 text-[#B83B3B]" />
                    <span className="text-xs font-bold text-[#242B31]">
                      {rep.reason}
                    </span>
                    <StatusBadge status={rep.status} />
                  </div>
                  <p className="text-xs text-[#718078]">
                    Pool: {rep.pool?.pool_code} ({rep.pool?.origin_name} →{" "}
                    {rep.pool?.destination_name})
                  </p>
                  {rep.details && (
                    <p className="text-xs text-[#242B31]">{rep.details}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/pools/${rep.pool_id}`}
                    className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold"
                  >
                    Inspect Pool
                  </Link>
                  {rep.status === "OPEN" && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => resolveReport(rep, "ACTIONED")}
                        className="rounded-lg bg-[#B83B3B] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Close Pool & Action
                      </button>
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => resolveReport(rep, "DISMISSED")}
                        className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-1.5 text-xs font-semibold"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pools Tab */}
      {tab === "pools" && (
        <div className="agri-card divide-y divide-[#E4E8E2]">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#173D32]">
                    {pool.pool_code}
                  </span>
                  <StatusBadge status={pool.status} />
                  {pool.is_flagged && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#B83B3B]/10 px-2 py-0.5 text-[10px] font-bold text-[#B83B3B]">
                      <ShieldAlert className="h-3 w-3" />
                      Flagged
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#242B31]">
                  {pool.origin_name} → {pool.destination_name}
                </p>
                <p className="text-[11px] text-[#718078]">
                  Available: {formatWeight(pool.available_capacity_kg)} /{" "}
                  {formatWeight(pool.total_capacity_kg)} •{" "}
                  {formatShortDate(pool.departure_date)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/pools/${pool.id}`}
                  className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold"
                >
                  View
                </Link>
                <button
                  type="button"
                  disabled={busyId === pool.id}
                  onClick={() =>
                    moderatePool(pool, pool.is_flagged ? "unflag" : "flag")
                  }
                  className="rounded-lg border border-[#D5A45B] px-3 py-1.5 text-xs font-semibold text-[#8A611E]"
                >
                  {pool.is_flagged ? "Unflag" : "Flag"}
                </button>
                {pool.status !== "CLOSED" && (
                  <button
                    type="button"
                    disabled={busyId === pool.id}
                    onClick={() => moderatePool(pool, "close")}
                    className="rounded-lg bg-[#B83B3B] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Close Listing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="agri-card divide-y divide-[#E4E8E2]">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#242B31]">
                    {user.full_name}
                  </span>
                  <span className="rounded bg-[#F4F5F1] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#173D32]">
                    {user.account_type}
                  </span>
                  {user.is_admin && (
                    <span className="rounded bg-[#173D32] px-2 py-0.5 text-[10px] font-semibold text-white">
                      ADMIN
                    </span>
                  )}
                  {user.is_suspended && (
                    <span className="rounded bg-[#B83B3B] px-2 py-0.5 text-[10px] font-semibold text-white">
                      SUSPENDED
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[#718078]">
                  {user.business_name ? `${user.business_name} • ` : ""}
                  {user.city && user.state
                    ? `${user.city}, ${user.state}`
                    : "Location unset"}{" "}
                  • Joined {formatShortDate(user.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${user.id}`}
                  className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold"
                >
                  Profile
                </Link>
                {user.id !== currentUserId && (
                  <button
                    type="button"
                    disabled={busyId === user.id}
                    onClick={() => toggleUserSuspension(user)}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      user.is_suspended
                        ? "bg-[#1F6B48] text-white"
                        : "border border-[#B83B3B]/35 text-[#B83B3B] hover:bg-[#B83B3B]/10"
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {user.is_suspended ? "Reactivate" : "Suspend"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deals Overview Tab */}
      {tab === "deals" && (
        <div className="agri-card divide-y divide-[#E4E8E2]">
          {deals.length === 0 ? (
            <p className="p-8 text-center text-xs text-[#718078]">
              No deals recorded yet.
            </p>
          ) : (
            deals.map((deal) => (
              <div
                key={deal.id}
                className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#173D32]">
                      {deal.deal_code}
                    </span>
                    <StatusBadge status={deal.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#242B31]">
                    {deal.pickup_point} → {deal.drop_point} •{" "}
                    {formatWeight(deal.agreed_capacity_kg)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold text-[#173D32]">
                    {formatCurrency(deal.agreed_price)}
                  </p>
                  <p className="text-[11px] text-[#718078]">
                    {formatShortDate(deal.confirmed_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

