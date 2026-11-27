import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import {
  AdminDashboardClient,
  type PoolReportItem,
} from "@/components/admin/AdminDashboardClient";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DealRecord, PoolListing, PublicProfile } from "@/types/domain";

export default async function AdminPage() {
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
    redirect("/login?next=/admin");
  }

  if (!ctx.profile?.is_admin || ctx.profile.is_suspended) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16">
          <div className="agri-card p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[#B83B3B]" />
            <h1 className="text-xl font-bold text-[#242B31]">
              Administrator Access Required
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#718078]">
              Your account does not have administrator privileges. Admin access
              is strictly controlled through database roles and RLS policies.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  let users: PublicProfile[] = [];
  let pools: PoolListing[] = [];
  let reports: PoolReportItem[] = [];
  let deals: DealRecord[] = [];

  if (supabase) {
    const [usersRes, poolsRes, reportsRes, dealsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("pools")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("pool_reports")
        .select(
          "*, pool:pools(id, pool_code, origin_name, destination_name, status)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("deals")
        .select("*")
        .order("confirmed_at", { ascending: false })
        .limit(100),
    ]);

    users = (usersRes.data as PublicProfile[]) || [];
    pools = (poolsRes.data as PoolListing[]) || [];
    reports = (reportsRes.data as PoolReportItem[]) || [];
    deals = (dealsRes.data as DealRecord[]) || [];
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#173D32]">
            AGRIHUB Operations & Moderation Panel
          </h1>
          <p className="mt-1 text-sm text-[#718078]">
            Review reported listings, moderate pool status, manage user account
            status, and audit confirmed deals.
          </p>
        </div>

        <AdminDashboardClient
          currentUserId={ctx.user.id}
          users={users}
          pools={pools}
          reports={reports}
          deals={deals}
        />
      </div>
    </AppShell>
  );
}

