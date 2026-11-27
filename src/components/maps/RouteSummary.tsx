import React from "react";
import { Clock, Navigation, Route } from "lucide-react";
import { formatDistanceKm, formatDuration } from "@/lib/utils";

interface RouteSummaryProps {
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  routeSource: "google_routes" | "manual";
  stopCount: number;
}

export function RouteSummary({
  distanceMeters,
  durationSeconds,
  routeSource,
  stopCount,
}: RouteSummaryProps) {
  const distanceLabel = formatDistanceKm(distanceMeters);
  const durationLabel = formatDuration(durationSeconds);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#E4E8E2] bg-white px-4 py-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-[#173D32]">
        <Route className="h-4 w-4 text-[#D5A45B]" />
        <span>
          {routeSource === "google_routes"
            ? "Google Routes Verified"
            : "Manual Corridor Entry"}
        </span>
      </div>

      {distanceLabel && (
        <div className="flex items-center gap-1.5 text-[#242B31]">
          <Navigation className="h-3.5 w-3.5 text-[#718078]" />
          <span>Distance: {distanceLabel}</span>
        </div>
      )}

      {durationLabel && (
        <div className="flex items-center gap-1.5 text-[#242B31]">
          <Clock className="h-3.5 w-3.5 text-[#718078]" />
          <span>Est. Drive: {durationLabel}</span>
        </div>
      )}

      <div className="text-[#718078]">
        {stopCount} intermediate stop{stopCount === 1 ? "" : "s"}
      </div>
    </div>
  );
}

