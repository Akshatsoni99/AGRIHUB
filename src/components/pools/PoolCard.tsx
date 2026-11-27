import React from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Sparkles, User, Weight } from "lucide-react";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RoutePreview } from "@/components/maps/RoutePreview";
import { VEHICLE_CATEGORY_MAP } from "@/lib/constants/vehicles";
import { CARGO_CATEGORY_MAP, PRICING_MODE_MAP } from "@/lib/constants/cargo";
import { computeCapacitySnapshot } from "@/lib/capacity/calculator";
import type { PoolMatchResult } from "@/lib/matching/route-matching";
import type { PoolListing } from "@/types/domain";
import {
  cn,
  formatCurrency,
  formatShortDate,
  formatTimeShort,
  formatWeight,
} from "@/lib/utils";

interface PoolCardProps {
  pool: PoolListing;
  match?: PoolMatchResult;
}

export function PoolCard({ pool, match }: PoolCardProps) {
  const vehicleSpec = VEHICLE_CATEGORY_MAP[pool.vehicle_category];
  const pricingSpec = PRICING_MODE_MAP[pool.pricing_mode];
  const cap = computeCapacitySnapshot(
    pool.total_capacity_kg,
    pool.existing_occupied_kg,
    pool.reserved_capacity_kg,
  );

  return (
    <article className="agri-card flex flex-col justify-between p-5 transition hover:border-[#173D32]/35">
      <div className="space-y-4">
        {/* Top Row: Vehicle + Pool Code + Status + Match Score */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#173D32]/10 text-[#173D32]">
              <VehicleIcon category={pool.vehicle_category} className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#242B31]">
                  {vehicleSpec?.label || pool.vehicle_category}
                </span>
                <span className="rounded bg-[#F4F5F1] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#173D32] border border-[#E4E8E2]">
                  {pool.pool_code}
                </span>
              </div>
              <p className="text-xs text-[#718078]">
                {CARGO_CATEGORY_MAP[pool.main_cargo_category]}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {match && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  match.totalScore >= 80
                    ? "border-[#1F6B48]/30 bg-[#1F6B48]/10 text-[#1F6B48]"
                    : match.totalScore >= 60
                      ? "border-[#D5A45B]/50 bg-[#D5A45B]/15 text-[#8A611E]"
                      : "border-[#E4E8E2] bg-[#F4F5F1] text-[#718078]",
                )}
              >
                <Sparkles className="h-3 w-3" />
                {match.totalScore}/100 • {match.matchTier}
              </span>
            )}
            <StatusBadge status={pool.status} />
          </div>
        </div>

        {/* Route Map Preview */}
        <RoutePreview
          originName={pool.origin_name}
          destinationName={pool.destination_name}
          stops={pool.stops}
          distanceMeters={pool.route_distance_meters}
          durationSeconds={pool.route_duration_seconds}
          routeSource={pool.route_source}
        />

        {/* Match Explanation if search criteria active */}
        {match && (
          <div className="rounded-lg border border-[#173D32]/15 bg-[#173D32]/5 px-3 py-2 text-xs text-[#173D32]">
            <p className="font-medium">{match.explanation}</p>
            <p className="mt-0.5 text-[10px] text-[#718078]">
              Evaluation mode:{" "}
              {match.matchMode === "geographic_route"
                ? "Google Maps corridor coordinates"
                : "Manual city & stop text fallback (not geographically verified)"}
            </p>
          </div>
        )}

        {/* Cargo Description */}
        <p className="line-clamp-2 text-xs leading-relaxed text-[#242B31]">
          {pool.cargo_description}
        </p>

        {/* Capacity Bar & Numbers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#173D32]">
              <Weight className="h-3.5 w-3.5 text-[#D5A45B]" />
              {formatWeight(cap.availableCapacityKg)} available
            </span>
            <span className="text-[#718078]">
              of {formatWeight(cap.totalCapacityKg)} total
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#F4F5F1] border border-[#E4E8E2]">
            <div
              className="h-full bg-[#173D32]"
              style={{
                width: `${Math.min(100, Math.round((cap.existingOccupiedKg / Math.max(1, cap.totalCapacityKg)) * 100))}%`,
              }}
            />
            <div
              className="h-full bg-[#D5A45B]"
              style={{
                width: `${Math.min(100, Math.round((cap.reservedCapacityKg / Math.max(1, cap.totalCapacityKg)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Row: Departure, Price, Creator, CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E8E2] pt-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#718078]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#173D32]" />
              {formatShortDate(pool.departure_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#173D32]" />
              {formatTimeShort(pool.departure_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-[#173D32]" />
              {pool.owner?.business_name || pool.owner?.full_name || "Operator"}
            </span>
          </div>
          <p className="text-sm font-bold text-[#173D32]">
            {formatCurrency(pool.asking_price)}{" "}
            <span className="text-xs font-normal text-[#718078]">
              ({pricingSpec?.unitSuffix || pool.pricing_mode})
            </span>
          </p>
        </div>

        <Link
          href={`/pools/${pool.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#244638]"
        >
          View & Request
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

