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

export const VehicleCategorySelector = React.memo(function VehicleCategorySelector({
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
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {includeAllOption && (
        <button
          type="button"
          onClick={() => onChange("all")}
          className={cn(
            "box-border flex h-full w-full min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#173D32] focus:ring-offset-2",
            compact ? "min-h-[136px]" : "min-h-[188px]",
            value === "all"
              ? "border-[#173D32] bg-[#173D32] text-white shadow-sm ring-2 ring-[#173D32]/25"
              : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/45 hover:bg-[#F4F5F1]/60",
          )}
        >
          <div className="flex w-full min-w-0 flex-col gap-2.5">
            <div className="flex w-full min-w-0 justify-end">
              <span
                className={cn(
                  "max-w-full break-words rounded-full px-2.5 py-0.5 text-right text-[11px] font-semibold leading-tight",
                  value === "all"
                    ? "bg-white/15 text-[#D5A45B]"
                    : "bg-[#F4F5F1] text-[#718078]",
                )}
              >
                350 kg – 35 Ton
              </span>
            </div>
            <div className="flex w-full min-w-0 items-center justify-center py-0.5">
              <div
                className={cn(
                  "flex items-center justify-center rounded-xl",
                  compact ? "h-11 w-11" : "h-13 w-13",
                  value === "all"
                    ? "bg-white/10 text-[#D5A45B]"
                    : "bg-[#F4F5F1] text-[#173D32]",
                )}
              >
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <span className="block break-words text-sm font-bold leading-snug sm:text-base">
              All Cargo Vehicles
            </span>
            {!compact && (
              <span
                className={cn(
                  "mt-1 block break-words text-xs leading-relaxed",
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
              "box-border flex h-full w-full min-w-0 max-w-full flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#173D32] focus:ring-offset-2",
              compact ? "min-h-[136px]" : "min-h-[188px]",
              selected
                ? "border-[#173D32] bg-[#173D32] text-white shadow-sm ring-2 ring-[#173D32]/25"
                : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/45 hover:bg-[#F4F5F1]/60",
            )}
          >
            <div className="flex w-full min-w-0 flex-col gap-2.5">
              <div className="flex w-full min-w-0 justify-end">
                <span
                  className={cn(
                    "max-w-full break-words rounded-full px-2.5 py-0.5 text-right text-[11px] font-semibold leading-tight",
                    selected
                      ? "bg-white/15 text-[#D5A45B]"
                      : "bg-[#F4F5F1] text-[#718078]",
                  )}
                >
                  {cat.typicalRangeLabel}
                </span>
              </div>

              <div className="flex w-full min-w-0 items-center justify-center py-0.5">
                <VehicleIcon
                  category={cat.id}
                  inverted={selected}
                  className={cn(
                    "max-w-full",
                    compact ? "h-11 w-20" : "h-13 w-24",
                  )}
                />
              </div>
            </div>

            <div className="mt-3 min-w-0">
              <span className="block break-words text-sm font-bold leading-snug sm:text-base">
                {cat.label}
              </span>
              {!compact && (
                <span
                  className={cn(
                    "mt-1 line-clamp-2 block break-words text-xs leading-relaxed",
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
});
