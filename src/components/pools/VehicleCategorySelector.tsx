"use client";

import React from "react";
import { Truck } from "lucide-react";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { VEHICLE_CATEGORIES } from "@/lib/constants/vehicles";
import type { VehicleCategory } from "@/types/domain";
import { cn } from "@/lib/utils";

interface VehicleCategorySelectorProps {
  value: VehicleCategory | "all";
  onChange: (value: VehicleCategory | "all") => void;
  includeAllOption?: boolean;
  compact?: boolean;
}

export function VehicleCategorySelector({
  value,
  onChange,
  includeAllOption = false,
  compact = false,
}: VehicleCategorySelectorProps) {
  return (
    <div
      className={cn(
        "grid gap-3.5",
        includeAllOption
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {includeAllOption && (
        <button
          type="button"
          onClick={() => onChange("all")}
          className={cn(
            "flex h-full flex-col justify-between rounded-2xl border p-4 sm:p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#173D32] focus:ring-offset-2",
            compact ? "min-h-[124px]" : "min-h-[172px]",
            value === "all"
              ? "border-[#173D32] bg-[#173D32] text-white shadow-sm ring-2 ring-[#173D32]/25"
              : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/45 hover:bg-[#F4F5F1]/60",
          )}
        >
          <div className="flex w-full items-center justify-between">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                value === "all"
                  ? "bg-white/10 text-[#D5A45B]"
                  : "bg-[#F4F5F1] text-[#173D32]",
              )}
            >
              <Truck className="h-6 w-6" />
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                value === "all"
                  ? "bg-white/15 text-[#D5A45B]"
                  : "bg-[#F4F5F1] text-[#718078]",
              )}
            >
              350 kg – 35 Ton
            </span>
          </div>
          <div className="mt-3">
            <span className="block text-sm sm:text-base font-bold">
              All Cargo Vehicles
            </span>
            {!compact && (
              <span
                className={cn(
                  "mt-1 block text-xs leading-relaxed",
                  value === "all" ? "text-white/80" : "text-[#718078]",
                )}
              >
                Show every cargo-capable fleet class
              </span>
            )}
          </div>
        </button>
      )}

      {VEHICLE_CATEGORIES.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            aria-pressed={selected}
            className={cn(
              "flex h-full flex-col justify-between rounded-2xl border p-4 sm:p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#173D32] focus:ring-offset-2",
              compact ? "min-h-[124px]" : "min-h-[172px]",
              selected
                ? "border-[#173D32] bg-[#173D32] text-white shadow-sm ring-2 ring-[#173D32]/25"
                : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/45 hover:bg-[#F4F5F1]/60",
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <VehicleIcon
                category={cat.id}
                inverted={selected}
                className={cn(compact ? "h-12 w-20" : "h-14 w-24 sm:h-16 sm:w-28")}
              />
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  selected
                    ? "bg-white/15 text-[#D5A45B]"
                    : "bg-[#F4F5F1] text-[#718078]",
                )}
              >
                {cat.typicalRangeLabel}
              </span>
            </div>

            <div className="mt-3">
              <span className="block text-sm sm:text-base font-bold">
                {cat.label}
              </span>
              {!compact && (
                <span
                  className={cn(
                    "mt-1 line-clamp-2 block text-xs leading-relaxed",
                    selected ? "text-white/80" : "text-[#718078]",
                  )}
                >
                  {cat.description}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
