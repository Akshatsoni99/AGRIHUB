"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LocationAutocomplete,
  type SelectedLocation,
} from "@/components/maps/LocationAutocomplete";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CARGO_CATEGORIES, CARGO_CATEGORY_MAP } from "@/lib/constants/cargo";
import { createPoolRequestSchema, reportPoolSchema } from "@/lib/validators/pool";
import type { CargoCategory, PoolListing, PoolRequest } from "@/types/domain";
import { formatCurrency, formatWeight } from "@/lib/utils";
import { toast } from "sonner";

interface PoolDetailActionsProps {
  pool: PoolListing;
  currentUserId: string | null;
  existingMyRequest: PoolRequest | null;
  incomingRequests: PoolRequest[];
}

export function PoolDetailActions({
  pool,
  currentUserId,
  existingMyRequest,
  incomingRequests,
}: PoolDetailActionsProps) {
  const router = useRouter();
  const isOwner = Boolean(currentUserId && currentUserId === pool.owner_id);

  // Join Request form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requiredCapacity, setRequiredCapacity] = useState(
    String(Math.min(500, Math.max(50, pool.available_capacity_kg))),
  );
  const [cargoCategory, setCargoCategory] = useState<CargoCategory>(
    pool.permitted_cargo_categories[0] || pool.main_cargo_category,
  );
  const [cargoDescription, setCargoDescription] = useState("");
  const [pickupLoc, setPickupLoc] = useState<SelectedLocation>({
    name: pool.origin_name,
    city: pool.origin_city,
    lat: pool.origin_lat,
    lng: pool.origin_lng,
  });
  const [dropLoc, setDropLoc] = useState<SelectedLocation>({
    name: pool.destination_name,
    city: pool.destination_city,
    lat: pool.destination_lat,
    lng: pool.destination_lng,
  });
  const [proposedPrice, setProposedPrice] = useState(String(pool.asking_price));
  const [pricingNote, setPricingNote] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  // Owner action loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("Misleading route or capacity");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  async function handleSubmitJoinRequest(e: React.FormEvent) {
    e.preventDefault();
    setReqError(null);
    if (!currentUserId) {
      router.push(`/login?next=/pools/${pool.id}`);
      return;
    }

    const parsed = createPoolRequestSchema.safeParse({
      pool_id: pool.id,
      required_capacity_kg: Number(requiredCapacity),
      cargo_category: cargoCategory,
      cargo_description: cargoDescription,
      pickup_location: pickupLoc.name,
      pickup_city: pickupLoc.city || pickupLoc.name,
      pickup_lat: pickupLoc.lat ?? null,
      pickup_lng: pickupLoc.lng ?? null,
      drop_location: dropLoc.name,
      drop_city: dropLoc.city || dropLoc.name,
      drop_lat: dropLoc.lat ?? null,
      drop_lng: dropLoc.lng ?? null,
      proposed_price: Number(proposedPrice),
      pricing_note: pricingNote || null,
    });

    if (!parsed.success) {
      setReqError(parsed.error.issues[0]?.message || "Invalid request values.");
      return;
    }

    if (parsed.data.required_capacity_kg > pool.available_capacity_kg) {
      setReqError(
        `Requested ${parsed.data.required_capacity_kg} kg exceeds currently available capacity (${pool.available_capacity_kg} kg).`,
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSubmittingReq(true);
    try {
      const { error } = await supabase.from("pool_requests").insert({
        pool_id: pool.id,
        requester_id: currentUserId,
        pool_owner_id: pool.owner_id,
        required_capacity_kg: parsed.data.required_capacity_kg,
        cargo_category: parsed.data.cargo_category,
        cargo_description: parsed.data.cargo_description,
        pickup_location: parsed.data.pickup_location,
        pickup_city: parsed.data.pickup_city,
        pickup_lat: parsed.data.pickup_lat,
        pickup_lng: parsed.data.pickup_lng,
        drop_location: parsed.data.drop_location,
        drop_city: parsed.data.drop_city,
        drop_lat: parsed.data.drop_lat,
        drop_lng: parsed.data.drop_lng,
        proposed_price: parsed.data.proposed_price,
        pricing_note: parsed.data.pricing_note,
        status: "PENDING",
      });

      if (error) {
        setReqError(error.message);
        return;
      }

      toast.success("Join request submitted! The transporter has been notified.");
      setShowRequestForm(false);
      router.refresh();
    } finally {
      setSubmittingReq(false);
    }
  }

  async function handleAcceptForDiscussion(requestId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setActionLoadingId(requestId);
    try {
      const { data: convId, error } = await supabase.rpc(
        "accept_pool_request",
        {
          p_request_id: requestId,
        },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Private negotiation chat opened!");
      router.push(`/messages?conversation=${convId}`);
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRejectRequest(requestId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setActionLoadingId(requestId);
    try {
      const { error } = await supabase.rpc("reject_pool_request", {
        p_request_id: requestId,
        p_reason: null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.info("Request declined.");
      router.refresh();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      router.push(`/login?next=/pools/${pool.id}`);
      return;
    }
    const parsed = reportPoolSchema.safeParse({
      pool_id: pool.id,
      reason: reportReason,
      details: reportDetails || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Enter report details.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setReporting(true);
    try {
      const { error } = await supabase.from("pool_reports").insert({
        pool_id: pool.id,
        reporter_id: currentUserId,
        reason: parsed.data.reason,
        details: parsed.data.details,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Listing reported for moderator review.");
      setShowReport(false);
      setReportDetails("");
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Primary CTA Panel */}
      <div className="agri-card p-5">
        {isOwner ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#173D32]">
                  Manage Incoming Pool Requests ({incomingRequests.length})
                </h3>
                <p className="text-xs text-[#718078]">
                  You own this listing. You cannot request capacity on your own
                  pool.
                </p>
              </div>
              <Link
                href="/my-pools"
                className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold text-[#242B31] hover:bg-[#F4F5F1]"
              >
                My Pools
              </Link>
            </div>

            {incomingRequests.length === 0 ? (
              <p className="rounded-lg bg-[#F4F5F1] p-4 text-xs text-[#718078]">
                No shippers have requested space on this pool yet.
              </p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#E4E8E2] bg-[#F4F5F1]/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#242B31]">
                          {req.requester?.full_name || "Shipper"}
                          {req.requester?.business_name
                            ? ` (${req.requester.business_name})`
                            : ""}
                        </p>
                        <p className="text-xs text-[#718078]">
                          Needs{" "}
                          <strong className="text-[#173D32]">
                            {formatWeight(req.required_capacity_kg)}
                          </strong>{" "}
                          • {CARGO_CATEGORY_MAP[req.cargo_category]} • Proposed{" "}
                          <strong className="text-[#173D32]">
                            {formatCurrency(req.proposed_price)}
                          </strong>
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <p className="mt-2 text-xs text-[#242B31]">
                      {req.cargo_description}
                    </p>
                    <p className="mt-1 text-[11px] text-[#718078]">
                      Pickup: {req.pickup_location} → Drop: {req.drop_location}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAcceptForDiscussion(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#244638] disabled:opacity-60"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                            Accept for Discussion
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#B83B3B]/35 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#B83B3B] hover:bg-[#B83B3B]/10 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </>
                      )}

                      {["ACCEPTED_FOR_DISCUSSION", "NEGOTIATING", "CONFIRMED"].includes(
                        req.status,
                      ) && (
                        <Link
                          href="/messages"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#173D32] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Open Negotiation Chat
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : existingMyRequest ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#173D32]">
                Your Join Request
              </h3>
              <StatusBadge status={existingMyRequest.status} />
            </div>
            <p className="text-xs text-[#718078]">
              Requested {formatWeight(existingMyRequest.required_capacity_kg)} •
              Proposed {formatCurrency(existingMyRequest.proposed_price)}
            </p>
            <p className="text-xs text-[#242B31]">
              {existingMyRequest.pickup_location} →{" "}
              {existingMyRequest.drop_location}
            </p>
            {["ACCEPTED_FOR_DISCUSSION", "NEGOTIATING", "CONFIRMED"].includes(
              existingMyRequest.status,
            ) ? (
              <Link
                href="/messages"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244638]"
              >
                <MessageSquare className="h-4 w-4" />
                Open Negotiation Chat
              </Link>
            ) : (
              <Link
                href="/my-requests"
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-4 py-2 text-xs font-semibold text-[#242B31]"
              >
                Manage in My Requests
              </Link>
            )}
          </div>
        ) : pool.status !== "OPEN" || pool.available_capacity_kg <= 0 ? (
          <div className="rounded-lg bg-[#F4F5F1] p-4 text-xs text-[#718078]">
            This pool is currently <strong>{pool.status}</strong> with{" "}
            {formatWeight(pool.available_capacity_kg)} remaining and is not
            accepting new requests.
          </div>
        ) : !showRequestForm ? (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#173D32]">
              Need space on this route?
            </h3>
            <p className="text-xs text-[#718078]">
              Submit a join request with your cargo weight, pickup/drop points,
              and proposed contribution. Capacity is reserved only after mutual
              confirmation in chat.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!currentUserId) {
                  router.push(`/login?next=/pools/${pool.id}`);
                  return;
                }
                setShowRequestForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244638]"
            >
              <CheckCircle2 className="h-4 w-4" />
              REQUEST TO JOIN POOL
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-2.5">
              <h3 className="text-sm font-bold text-[#173D32]">
                Request to Join {pool.pool_code}
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="text-xs font-medium text-[#718078] hover:text-[#242B31]"
              >
                Cancel
              </button>
            </div>

            {reqError && (
              <div className="flex items-start gap-2 rounded-lg border border-[#B83B3B]/30 bg-[#B83B3B]/10 p-3 text-xs text-[#B83B3B]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{reqError}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="req-cap"
                  className="mb-1 block text-xs font-semibold text-[#242B31]"
                >
                  Required Capacity (kg) * (Max {pool.available_capacity_kg})
                </label>
                <input
                  id="req-cap"
                  type="number"
                  required
                  min={1}
                  max={pool.available_capacity_kg}
                  value={requiredCapacity}
                  onChange={(e) => setRequiredCapacity(e.target.value)}
                  className="agri-input"
                />
              </div>

              <div>
                <label
                  htmlFor="req-cargo-cat"
                  className="mb-1 block text-xs font-semibold text-[#242B31]"
                >
                  Cargo Category *
                </label>
                <select
                  id="req-cargo-cat"
                  value={cargoCategory}
                  onChange={(e) =>
                    setCargoCategory(e.target.value as CargoCategory)
                  }
                  className="agri-input"
                >
                  {CARGO_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="req-cargo-desc"
                className="mb-1 block text-xs font-semibold text-[#242B31]"
              >
                Cargo Description *
              </label>
              <textarea
                id="req-cargo-desc"
                rows={2}
                required
                value={cargoDescription}
                onChange={(e) => setCargoDescription(e.target.value)}
                placeholder="e.g. 12 jute sacks of sorted red onions, packed dry"
                className="agri-input"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LocationAutocomplete
                id="req-pickup"
                label="Pickup Location *"
                value={pickupLoc.name}
                selectedLat={pickupLoc.lat}
                selectedLng={pickupLoc.lng}
                required
                onChange={setPickupLoc}
              />
              <LocationAutocomplete
                id="req-drop"
                label="Drop Location *"
                value={dropLoc.name}
                selectedLat={dropLoc.lat}
                selectedLng={dropLoc.lng}
                required
                onChange={setDropLoc}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="req-price"
                  className="mb-1 block text-xs font-semibold text-[#242B31]"
                >
                  Proposed Contribution (₹ Total) *
                </label>
                <input
                  id="req-price"
                  type="number"
                  min={0}
                  required
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  className="agri-input"
                />
              </div>
              <div>
                <label
                  htmlFor="req-note"
                  className="mb-1 block text-xs font-semibold text-[#242B31]"
                >
                  Note (Optional)
                </label>
                <input
                  id="req-note"
                  type="text"
                  value={pricingNote}
                  onChange={(e) => setPricingNote(e.target.value)}
                  placeholder="Loading window or helper info"
                  className="agri-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingReq}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244638] disabled:opacity-60"
            >
              {submittingReq ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submittingReq ? "Submitting Request..." : "Submit Join Request"}
            </button>
          </form>
        )}
      </div>

      {/* Report Listing */}
      {!isOwner && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowReport((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#718078] hover:text-[#B83B3B]"
          >
            <Flag className="h-3.5 w-3.5" />
            Report suspicious or inaccurate listing
          </button>
        </div>
      )}

      {showReport && (
        <form onSubmit={handleReportSubmit} className="agri-card space-y-3 p-4">
          <p className="text-xs font-bold text-[#242B31]">Report Pool Listing</p>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="agri-input"
          >
            <option value="Misleading route or capacity">
              Misleading route or capacity
            </option>
            <option value="Passenger vehicle listed as cargo">
              Passenger vehicle listed as cargo
            </option>
            <option value="Spam or duplicate listing">
              Spam or duplicate listing
            </option>
            <option value="Inappropriate content">Inappropriate content</option>
          </select>
          <textarea
            rows={2}
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Describe the issue briefly..."
            className="agri-input"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reporting}
              className="rounded-lg bg-[#B83B3B] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {reporting ? "Sending..." : "Submit Report"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

