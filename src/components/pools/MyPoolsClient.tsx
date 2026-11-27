"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, ExternalLink, Lock, PlusCircle, Truck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { VEHICLE_CATEGORY_MAP } from "@/lib/constants/vehicles";
import type { PoolListing } from "@/types/domain";
import {
  formatCurrency,
  formatShortDate,
  formatTimeShort,
  formatWeight,
} from "@/lib/utils";
import { toast } from "sonner";

export interface PoolWithCounts extends PoolListing {
  pendingRequestsCount: number;
  confirmedDealsCount: number;
}

interface MyPoolsClientProps {
  initialPools: PoolWithCounts[];
}

export function MyPoolsClient({ initialPools }: MyPoolsClientProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editOccupied, setEditOccupied] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(pool: PoolWithCounts) {
    setEditingId(pool.id);
    setEditPrice(String(pool.asking_price));
    setEditOccupied(String(pool.existing_occupied_kg));
    setEditNotes(pool.cargo_description);
  }

  async function saveEdit(pool: PoolWithCounts) {
    const newPrice = Number(editPrice);
    const newOccupied = Number(editOccupied);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      toast.error("Price cannot be negative.");
      return;
    }
    if (
      !Number.isInteger(newOccupied) ||
      newOccupied < 0 ||
      newOccupied + pool.reserved_capacity_kg > pool.total_capacity_kg
    ) {
      toast.error(
        `Occupied cargo must leave room for existing reserved deals (${pool.reserved_capacity_kg} kg).`,
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSaving(true);
    try {
      const nextAvailable =
        pool.total_capacity_kg - newOccupied - pool.reserved_capacity_kg;
      const nextStatus =
        pool.status === "OPEN" && nextAvailable === 0
          ? "FULL"
          : pool.status === "FULL" && nextAvailable > 0
            ? "OPEN"
            : pool.status;

      const { error } = await supabase
        .from("pools")
        .update({
          asking_price: newPrice,
          existing_occupied_kg: newOccupied,
          cargo_description: editNotes.trim(),
          status: nextStatus,
        })
        .eq("id", pool.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Pool updated");
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleClosePool(poolId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase
      .from("pools")
      .update({ status: "CLOSED" })
      .eq("id", poolId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pool closed to new requests");
    router.refresh();
  }

  if (initialPools.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="You haven't published any truck pools yet"
        description="List your vehicle's unused cargo space along a route so nearby producers and businesses can pool shipments with you."
        actionLabel="Create Your First Pool"
        actionHref="/truck-pool/create"
      />
    );
  }

  return (
    <div className="space-y-4">
      {initialPools.map((pool) => {
        const isEditing = editingId === pool.id;
        return (
          <div key={pool.id} className="agri-card p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-18 shrink-0 items-center justify-center rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] px-1.5 py-1">
                  <VehicleIcon
                    category={pool.vehicle_category}
                    className="h-9 w-15"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#173D32]">
                      {pool.pool_code}
                    </span>
                    <StatusBadge status={pool.status} />
                    <span className="text-xs text-[#718078]">
                      {VEHICLE_CATEGORY_MAP[pool.vehicle_category]?.label}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-[#242B31]">
                    {pool.origin_name} → {pool.destination_name}
                  </h2>
                  <p className="text-xs text-[#718078]">
                    Departs {formatShortDate(pool.departure_date)} at{" "}
                    {formatTimeShort(pool.departure_time)} • Asking{" "}
                    {formatCurrency(pool.asking_price)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/pools/${pool.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
                >
                  Open Pool
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                {["OPEN", "FULL"].includes(pool.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        isEditing ? setEditingId(null) : startEdit(pool)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-1.5 text-xs font-semibold text-[#242B31]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClosePool(pool.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#B83B3B]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#B83B3B] hover:bg-[#B83B3B]/10"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Close Pool
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] p-3.5 text-xs sm:grid-cols-4">
              <div>
                <p className="text-[#718078]">Available Capacity</p>
                <p className="mt-0.5 font-bold text-[#173D32]">
                  {formatWeight(pool.available_capacity_kg)} /{" "}
                  {formatWeight(pool.total_capacity_kg)}
                </p>
              </div>
              <div>
                <p className="text-[#718078]">Reserved Deals Weight</p>
                <p className="mt-0.5 font-bold text-[#8A611E]">
                  {formatWeight(pool.reserved_capacity_kg)}
                </p>
              </div>
              <div>
                <p className="text-[#718078]">Pending Requests</p>
                <p className="mt-0.5 font-bold text-[#242B31]">
                  {pool.pendingRequestsCount} awaiting review
                </p>
              </div>
              <div>
                <p className="text-[#718078]">Confirmed Shipments</p>
                <p className="mt-0.5 font-bold text-[#1F6B48]">
                  {pool.confirmedDealsCount} confirmed
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#173D32]/25 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Asking Price (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="agri-input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">
                      Existing Base Cargo (kg)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={pool.total_capacity_kg - pool.reserved_capacity_kg}
                      value={editOccupied}
                      onChange={(e) => setEditOccupied(e.target.value)}
                      className="agri-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Cargo Description
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="agri-input"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdit(pool)}
                    className="rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white"
                  >
                    {saving ? "Saving..." : "Save Pool Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-2">
        <Link
          href="/truck-pool/create"
          className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white"
        >
          <PlusCircle className="h-4 w-4" />
          Create Another Pool
        </Link>
      </div>
    </div>
  );
}

