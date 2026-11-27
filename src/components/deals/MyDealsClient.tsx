"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  History,
  Loader2,
  Phone,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { reviewSchema } from "@/lib/validators/pool";
import type { DealRecord } from "@/types/domain";
import {
  formatCurrency,
  formatRelativeTime,
  formatShortDate,
  formatWeight,
} from "@/lib/utils";
import { toast } from "sonner";

export interface EnrichedDeal extends DealRecord {
  counterpartyPhone?: string | null;
  counterpartyEmail?: string | null;
  vehicleRegNumber?: string | null;
  hasReviewed?: boolean;
  transactions?: {
    id: string;
    event_type: string;
    capacity_delta_kg: number;
    notes: string | null;
    created_at: string;
  }[];
}

interface MyDealsClientProps {
  currentUserId: string;
  initialDeals: EnrichedDeal[];
}

export function MyDealsClient({
  currentUserId,
  initialDeals,
}: MyDealsClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewingDealId, setReviewingDealId] = useState<string | null>(null);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function handleStatusAdvance(
    dealId: string,
    newStatus: "IN_TRANSIT" | "DELIVERED",
  ) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(dealId);
    try {
      const { error } = await supabase.rpc("update_deal_shipment_status", {
        p_deal_id: dealId,
        p_new_status: newStatus,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Shipment marked ${newStatus.replace("_", " ")}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelDeal(dealId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(dealId);
    try {
      const { error } = await supabase.rpc("cancel_confirmed_deal", {
        p_deal_id: dealId,
        p_reason: "Cancelled by participant prior to dispatch",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.info("Deal cancelled and reserved capacity released back to pool.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitReview(deal: EnrichedDeal) {
    const revieweeId =
      deal.owner_id === currentUserId ? deal.requester_id : deal.owner_id;

    const parsed = reviewSchema.safeParse({
      deal_id: deal.id,
      rating: Number(rating),
      comment: comment || null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid rating.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        deal_id: deal.id,
        reviewer_id: currentUserId,
        reviewee_id: revieweeId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Verified deal review submitted!");
      setReviewingDealId(null);
      setComment("");
      router.refresh();
    } finally {
      setSubmittingReview(false);
    }
  }

  if (initialDeals.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No confirmed deals yet"
        description="Confirmed deals appear here only after both the transporter and shipper confirm identical terms in private negotiation chat."
        actionLabel="Browse Open Pools"
        actionHref="/truck-pool/find"
      />
    );
  }

  return (
    <div className="space-y-5">
      {initialDeals.map((deal) => {
        const isOwner = deal.owner_id === currentUserId;
        const counterparty = isOwner ? deal.requester : deal.owner;
        const isBusy = busyId === deal.id;

        return (
          <div key={deal.id} className="agri-card space-y-4 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-[#E4E8E2] pb-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#173D32] px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {deal.deal_code}
                  </span>
                  <StatusBadge status={deal.status} />
                  <span className="text-xs font-medium text-[#718078]">
                    Role: {isOwner ? "Transporter" : "Shipper"}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-[#242B31]">
                  {deal.pickup_point} → {deal.drop_point}
                </h2>
                <p className="text-xs text-[#718078]">
                  Pool {deal.pool?.pool_code} •{" "}
                  {deal.pool?.departure_date
                    ? formatShortDate(deal.pool.departure_date)
                    : ""}{" "}
                  • Confirmed {formatRelativeTime(deal.confirmed_at)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xl font-extrabold text-[#173D32]">
                  {formatCurrency(deal.agreed_price)}
                </p>
                <p className="text-xs font-semibold text-[#D5A45B]">
                  {formatWeight(deal.agreed_capacity_kg)} reserved
                </p>
              </div>
            </div>

            {/* Unlocked Contact & Vehicle Registration (Only for Confirmed Deals) */}
            <div className="grid gap-4 rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold text-[#718078]">Counterparty</p>
                <Link
                  href={`/profile/${counterparty?.id || ""}`}
                  className="mt-1 block font-bold text-[#173D32] hover:underline"
                >
                  {counterparty?.full_name || "Partner"}
                </Link>
                {counterparty?.business_name && (
                  <p className="text-[#242B31]">{counterparty.business_name}</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-[#718078]">
                  Unlocked Contact Details
                </p>
                {deal.status !== "CANCELLED" ? (
                  <div className="mt-1 space-y-0.5 text-[#242B31]">
                    <p className="inline-flex items-center gap-1.5 font-semibold">
                      <Phone className="h-3.5 w-3.5 text-[#1F6B48]" />
                      {deal.counterpartyPhone || "Not provided"}
                    </p>
                    {deal.counterpartyEmail && (
                      <p className="text-[11px] text-[#718078]">
                        {deal.counterpartyEmail}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-[#718078]">Deal cancelled</p>
                )}
              </div>

              <div>
                <p className="font-semibold text-[#718078]">
                  Vehicle & Departure
                </p>
                <p className="mt-1 font-mono font-bold text-[#242B31]">
                  {deal.vehicleRegNumber || "Restricted"}
                </p>
                <p className="text-[11px] text-[#718078]">
                  Departure: {deal.departure_time || "As scheduled"}
                </p>
              </div>
            </div>

            {deal.special_conditions && (
              <p className="text-xs text-[#242B31]">
                <strong>Agreed Conditions:</strong> {deal.special_conditions}
              </p>
            )}

            {/* Deal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {deal.conversation_id && (
                  <Link
                    href={`/messages?conversation=${deal.conversation_id}`}
                    className="rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#242B31] hover:bg-[#F4F5F1]"
                  >
                    Open Chat Thread
                  </Link>
                )}
                <Link
                  href={`/pools/${deal.pool_id}`}
                  className="rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#242B31] hover:bg-[#F4F5F1]"
                >
                  View Pool
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {deal.status === "CONFIRMED" && (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleStatusAdvance(deal.id, "IN_TRANSIT")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#244638]"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Truck className="h-3.5 w-3.5" />
                      )}
                      Mark In Transit
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleCancelDeal(deal.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#B83B3B]/35 px-3.5 py-1.5 text-xs font-semibold text-[#B83B3B] hover:bg-[#B83B3B]/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel Deal & Release Space
                    </button>
                  </>
                )}

                {(deal.status === "CONFIRMED" || deal.status === "IN_TRANSIT") && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleStatusAdvance(deal.id, "DELIVERED")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F6B48] px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Delivered
                  </button>
                )}

                {deal.status === "DELIVERED" && !deal.hasReviewed && (
                  <button
                    type="button"
                    onClick={() =>
                      setReviewingDealId(
                        reviewingDealId === deal.id ? null : deal.id,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D5A45B] px-3.5 py-1.5 text-xs font-semibold text-[#173D32]"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Rate Counterparty
                  </button>
                )}

                {deal.status === "DELIVERED" && deal.hasReviewed && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F6B48]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Review Submitted
                  </span>
                )}
              </div>
            </div>

            {/* Review Form */}
            {reviewingDealId === deal.id && (
              <div className="rounded-xl border border-[#D5A45B]/50 bg-[#F4F5F1] p-4 space-y-3">
                <p className="text-xs font-bold text-[#173D32]">
                  Submit Verified Deal Review for {counterparty?.full_name}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Rating (1 to 5)
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="agri-input"
                    >
                      <option value="5">5 — Excellent</option>
                      <option value="4">4 — Reliable</option>
                      <option value="3">3 — Satisfactory</option>
                      <option value="2">2 — Needs Improvement</option>
                      <option value="1">1 — Poor</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">
                      Review Comment (Optional)
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Punctuality, cargo care, communication..."
                      className="agri-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewingDealId(null)}
                    className="rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={() => handleSubmitReview(deal)}
                    className="rounded-lg bg-[#173D32] px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </div>
            )}

            {/* Deal Transaction Audit Trail */}
            {deal.transactions && deal.transactions.length > 0 && (
              <div className="border-t border-[#E4E8E2] pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <History className="h-3.5 w-3.5" />
                  Capacity & Deal History
                </p>
                <div className="space-y-1 text-[11px] text-[#718078]">
                  {deal.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span>
                        <strong className="text-[#242B31]">
                          {tx.event_type.replace(/_/g, " ")}
                        </strong>{" "}
                        {tx.notes ? `— ${tx.notes}` : ""}
                      </span>
                      <span>{formatRelativeTime(tx.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

