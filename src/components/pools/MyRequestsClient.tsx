"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MessageSquare, Search, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CARGO_CATEGORY_MAP } from "@/lib/constants/cargo";
import type { PoolRequest } from "@/types/domain";
import {
  formatCurrency,
  formatShortDate,
  formatWeight,
} from "@/lib/utils";
import { toast } from "sonner";

interface MyRequestsClientProps {
  initialRequests: PoolRequest[];
}

export function MyRequestsClient({ initialRequests }: MyRequestsClientProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancelRequest(requestId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setCancellingId(requestId);
    try {
      const { error } = await supabase
        .from("pool_requests")
        .update({ status: "CANCELLED" })
        .eq("id", requestId);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.info("Request cancelled");
      router.refresh();
    } finally {
      setCancellingId(null);
    }
  }

  if (initialRequests.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No outgoing pool requests yet"
        description="Search open vehicles on your route and submit a join request to coordinate a shared shipment."
        actionLabel="Find a Pool"
        actionHref="/truck-pool/find"
      />
    );
  }

  return (
    <div className="space-y-4">
      {initialRequests.map((req) => {
        const canCancel = [
          "PENDING",
          "ACCEPTED_FOR_DISCUSSION",
          "NEGOTIATING",
        ].includes(req.status);
        const canChat = [
          "ACCEPTED_FOR_DISCUSSION",
          "NEGOTIATING",
          "CONFIRMED",
        ].includes(req.status);

        return (
          <div key={req.id} className="agri-card p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#173D32]">
                    {req.pool?.pool_code || "POOL"}
                  </span>
                  <StatusBadge status={req.status} />
                  <span className="text-xs text-[#718078]">
                    {CARGO_CATEGORY_MAP[req.cargo_category]}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#242B31]">
                  {req.pickup_location} → {req.drop_location}
                </h2>
                <p className="text-xs text-[#718078]">
                  Vehicle route: {req.pool?.origin_name} →{" "}
                  {req.pool?.destination_name} •{" "}
                  {req.pool?.departure_date
                    ? formatShortDate(req.pool.departure_date)
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/pools/${req.pool_id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#242B31]"
                >
                  Pool Details
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {canChat && (
                  <Link
                    href="/messages"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#244638]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Negotiate in Chat
                  </Link>
                )}
                {canCancel && (
                  <button
                    type="button"
                    disabled={cancellingId === req.id}
                    onClick={() => handleCancelRequest(req.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#B83B3B]/30 px-3 py-1.5 text-xs font-semibold text-[#B83B3B] hover:bg-[#B83B3B]/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] p-3 text-xs sm:grid-cols-3">
              <div>
                <span className="text-[#718078]">Requested Weight:</span>{" "}
                <strong className="text-[#242B31]">
                  {formatWeight(req.required_capacity_kg)}
                </strong>
              </div>
              <div>
                <span className="text-[#718078]">Proposed Contribution:</span>{" "}
                <strong className="text-[#173D32]">
                  {formatCurrency(req.proposed_price)}
                </strong>
              </div>
              <div>
                <span className="text-[#718078]">Transporter:</span>{" "}
                <strong className="text-[#242B31]">
                  {req.pool_owner?.full_name || "Operator"}
                </strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

