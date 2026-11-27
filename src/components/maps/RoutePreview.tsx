import React from "react";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import type { PoolStop } from "@/types/domain";
import { formatDistanceKm, formatDuration } from "@/lib/utils";

interface RoutePreviewProps {
  originName: string;
  destinationName: string;
  stops?: PoolStop[];
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  routeSource?: "osrm" | "google_routes" | "manual";
}

export function RoutePreview({
  originName,
  destinationName,
  stops = [],
  distanceMeters,
  durationSeconds,
}: RoutePreviewProps) {
  const distanceLabel = formatDistanceKm(distanceMeters);
  const durationLabel = formatDuration(durationSeconds);

  return (
    <div className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#242B31]">
          <MapPin className="h-3.5 w-3.5 text-[#173D32]" />
          <span>{originName}</span>
          {stops.length > 0 && (
            <>
              <ArrowRight className="h-3 w-3 text-[#718078]" />
              <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#718078] border border-[#E4E8E2]">
                +{stops.length} stop{stops.length > 1 ? "s" : ""}
              </span>
            </>
          )}
          <ArrowRight className="h-3 w-3 text-[#718078]" />
          <span>{destinationName}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#718078]">
          <Navigation className="h-3 w-3 text-[#D5A45B]" />
          {distanceLabel
            ? `${distanceLabel}${durationLabel ? ` • ${durationLabel}` : ""}`
            : "Manual route"}
        </span>
      </div>

      {stops.length > 0 && (
        <p className="mt-1.5 truncate text-[11px] text-[#718078]">
          Via:{" "}
          {[...stops]
            .sort((a, b) => a.stop_order - b.stop_order)
            .map((s) => s.location_name)
            .join(" • ")}
        </p>
      )}
    </div>
  );
}
