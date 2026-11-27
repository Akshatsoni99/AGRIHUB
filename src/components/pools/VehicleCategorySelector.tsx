"use client";

import React from "react";
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
        "grid gap-2.5",
        compact
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          : includeAllOption
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
      )}
    >
      {includeAllOption && (
        <button
          type="button"
          onClick={() => onChange("all")}
          className={cn(
            "flex flex-col items-start rounded-xl border p-3.5 text-left transition",
            value === "all"
              ? "border-[#173D32] bg-[#173D32] text-white"
              : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/40",
          )}
        >
          <span className="text-xs font-bold">All Cargo Vehicles</span>
          <span
            className={cn(
              "mt-1 text-[11px]",
              value === "all" ? "text-white/80" : "text-[#718078]",
            )}
          >
            250 kg – 35 t
          </span>
        </button>
      )}

      {VEHICLE_CATEGORIES.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={cn(
              "flex flex-col items-start rounded-xl border p-3.5 text-left transition",
              selected
                ? "border-[#173D32] bg-[#173D32] text-white"
                : "border-[#E4E8E2] bg-white text-[#242B31] hover:border-[#173D32]/40",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <VehicleIcon
                category={cat.id}
                className={cn(
                  "h-5 w-5",
                  selected ? "text-[#D5A45B]" : "text-[#173D32]",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  selected ? "text-[#D5A45B]" : "text-[#718078]",
                )}
              >
                {cat.typicalRangeLabel}
              </span>
            </div>
            <span className="mt-2.5 text-xs font-bold">{cat.label}</span>
            {!compact && (
              <span
                className={cn(
                  "mt-1 line-clamp-2 text-[11px] leading-snug",
                  selected ? "text-white/80" : "text-[#718078]",
                )}
              >
                {cat.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

