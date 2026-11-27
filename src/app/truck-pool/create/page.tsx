import React, { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { CreatePoolForm } from "@/components/pools/CreatePoolForm";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";

export default async function CreatePoolPage() {
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
    redirect("/login?next=/truck-pool/create");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/truck-pool"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#718078] hover:text-[#173D32]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Truck Pool Hub
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#173D32]">
              Create a Shared Truck Pool
            </h1>
            <p className="mt-1 text-sm text-[#718078]">
              Publish available cargo space along your planned route so nearby
              producers and businesses can request to join.
            </p>
          </div>
          <Link
            href="/truck-pool/find"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#242B31] hover:bg-[#F4F5F1]"
          >
            <Search className="h-3.5 w-3.5 text-[#173D32]" />
            Switch to Find Pool
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="agri-card h-96 animate-pulse bg-white p-6" />
          }
        >
          <CreatePoolForm userId={ctx.user.id} profile={ctx.profile} />
        </Suspense>
      </div>
    </AppShell>
  );
}

