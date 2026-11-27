"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Sprout, Truck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CARGO_CATEGORIES, CARGO_CATEGORY_MAP } from "@/lib/constants/cargo";
import type { CargoCategory } from "@/types/domain";
import { formatShortDate, formatWeight } from "@/lib/utils";
import { toast } from "sonner";

export interface ProduceListingItem {
  id: string;
  seller_id: string;
  title: string;
  cargo_category: CargoCategory;
  quantity_kg: number;
  origin_name: string;
  preferred_destination: string | null;
  ready_date: string;
  notes: string | null;
  status: string;
  created_at: string;
  seller?: {
    id: string;
    full_name: string;
    business_name: string | null;
    city: string | null;
  };
}

interface MarketplaceClientProps {
  currentUserId: string | null;
  initialListings: ProduceListingItem[];
}

export function MarketplaceClient({
  currentUserId,
  initialListings,
}: MarketplaceClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [cargoCategory, setCargoCategory] = useState<CargoCategory>("grains");
  const [quantityKg, setQuantityKg] = useState("600");
  const [originName, setOriginName] = useState("");
  const [preferredDest, setPreferredDest] = useState("");
  const [readyDate, setReadyDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePublishLot(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      router.push("/login?next=/marketplace");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("produce_listings").insert({
        seller_id: currentUserId,
        title: title.trim(),
        cargo_category: cargoCategory,
        quantity_kg: Number(quantityKg),
        origin_name: originName.trim(),
        preferred_destination: preferredDest.trim() || null,
        ready_date: readyDate,
        notes: notes.trim() || null,
        status: "ACTIVE",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Produce shipment demand posted");
      setShowForm(false);
      setTitle("");
      setOriginName("");
      setPreferredDest("");
      setNotes("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="agri-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#1F6B48]">
            <Sprout className="h-4 w-4" />
            <span>Supporting Shipment Demand Board</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold text-[#173D32]">
            Producer Trade & Shipment Demand
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#718078]">
            Discover rural produce lots needing transport—or jump straight into
            AGRIHUB&apos;s primary Shared Truck Pool module to match vehicles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/truck-pool/find"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#173D32] bg-white px-4 py-2 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
          >
            <Truck className="h-4 w-4" />
            Open Truck Pool
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!currentUserId) {
                router.push("/login?next=/marketplace");
                return;
              }
              setShowForm((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#244638]"
          >
            <Plus className="h-4 w-4" />
            Post Shipment Demand
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handlePublishLot} className="agri-card space-y-4 p-6">
          <h2 className="text-base font-bold text-[#173D32]">
            Post Agricultural / Trade Lot Needing Transport
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold">
                Produce / Lot Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 600 kg Graded Pomegranate Crates"
                className="agri-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Category *
              </label>
              <select
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

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Quantity (kg) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                className="agri-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Pickup Town / Mandi *
              </label>
              <input
                type="text"
                required
                value={originName}
                onChange={(e) => setOriginName(e.target.value)}
                className="agri-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Target Destination
              </label>
              <input
                type="text"
                value={preferredDest}
                onChange={(e) => setPreferredDest(e.target.value)}
                className="agri-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Ready Date *
              </label>
              <input
                type="date"
                required
                value={readyDate}
                onChange={(e) => setReadyDate(e.target.value)}
                className="agri-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">
              Packaging / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="agri-input"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[#E4E8E2] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white"
            >
              {saving ? "Publishing..." : "Publish Lot"}
            </button>
          </div>
        </form>
      )}

      {initialListings.length === 0 ? (
        <div className="agri-card py-12 text-center">
          <Sprout className="mx-auto mb-2.5 h-8 w-8 text-[#173D32]" />
          <p className="text-sm font-semibold text-[#242B31]">
            No produce shipment lots posted yet
          </p>
          <p className="mt-1 text-xs text-[#718078]">
            Producers can list upcoming harvest batches here to coordinate shared
            truck capacity.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialListings.map((lot) => {
            const params = new URLSearchParams({
              origin: lot.origin_name,
              capacity: String(lot.quantity_kg),
              cargo: lot.cargo_category,
            });
            if (lot.preferred_destination) {
              params.set("destination", lot.preferred_destination);
            }
            return (
              <div
                key={lot.id}
                className="agri-card flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#718078]">
                    <span>{CARGO_CATEGORY_MAP[lot.cargo_category]}</span>
                    <span>Ready {formatShortDate(lot.ready_date)}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-[#242B31]">
                    {lot.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#173D32]">
                    {formatWeight(lot.quantity_kg)} • {lot.origin_name}
                    {lot.preferred_destination
                      ? ` → ${lot.preferred_destination}`
                      : ""}
                  </p>
                  {lot.notes && (
                    <p className="mt-2 text-xs text-[#718078]">{lot.notes}</p>
                  )}
                  <p className="mt-2 text-[11px] text-[#718078]">
                    Posted by{" "}
                    {lot.seller?.business_name ||
                      lot.seller?.full_name ||
                      "Producer"}
                  </p>
                </div>

                <Link
                  href={`/truck-pool/find?${params.toString()}`}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#173D32] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#244638]"
                >
                  Find Truck Pool for this Lot
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

