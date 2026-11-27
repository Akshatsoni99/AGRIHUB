"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Info, MapPin, Navigation } from "lucide-react";
import { isValidCoordinatePair } from "@/lib/maps/routing-utils";
import { cn } from "@/lib/utils";

const LeafletRouteMapInner = dynamic(
  () => import("@/components/maps/LeafletRouteMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#F4F5F1] text-xs font-medium text-[#718078]">
        Loading OpenStreetMap route view...
      </div>
    ),
  },
);

export interface RouteMapWaypoint {
  label: string;
  lat?: number | null;
  lng?: number | null;
  role: "origin" | "stop" | "destination";
}

interface RouteMapProps {
  waypoints: RouteMapWaypoint[];
  encodedPolyline?: string | null;
  routeCoordinates?: [number, number][] | null;
  heightClassName?: string;
  className?: string;
}

export function RouteMap({
  waypoints,
  encodedPolyline,
  routeCoordinates,
  heightClassName = "h-72 sm:h-80",
  className,
}: RouteMapProps) {
  const coordWaypoints = useMemo(
    () => waypoints.filter((w) => isValidCoordinatePair(w.lat, w.lng)),
    [waypoints],
  );

  const hasRoadPolyline = Boolean(
    (routeCoordinates && routeCoordinates.length >= 2) ||
      (encodedPolyline && encodedPolyline.trim().length > 0),
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#E4E8E2] bg-[#F4F5F1]",
        className,
      )}
    >
      {coordWaypoints.length > 0 ? (
        <div className="space-y-0">
          <div className={cn("relative w-full", heightClassName)}>
            <LeafletRouteMapInner
              waypoints={waypoints}
              encodedPolyline={encodedPolyline}
              routeCoordinates={routeCoordinates}
            />
          </div>
          {!hasRoadPolyline && coordWaypoints.length >= 2 && (
            <div className="flex items-center gap-2 border-t border-[#E4E8E2] bg-white px-3.5 py-2 text-[11px] text-[#718078]">
              <Info className="h-3.5 w-3.5 shrink-0 text-[#D5A45B]" />
              <span>
                Origin and destination pins shown. Road polyline will display once
                calculated via OSRM routing.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E8E2] pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#173D32]">
              <Navigation className="h-4 w-4 text-[#D5A45B]" />
              <span>Declared Corridor Stops (Text Route View)</span>
            </div>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#718078] border border-[#E4E8E2]">
              Coordinates not set
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            {waypoints.map((wp, idx) => (
              <React.Fragment key={`${wp.label}-${idx}`}>
                <div className="flex items-center gap-2 rounded-lg border border-[#E4E8E2] bg-white px-3 py-2 text-xs">
                  <MapPin
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      wp.role === "origin"
                        ? "text-[#173D32]"
                        : wp.role === "destination"
                          ? "text-[#1F6B48]"
                          : "text-[#D5A45B]",
                    )}
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-[#718078]">
                      {wp.role === "stop" ? `Stop ${idx}` : wp.role}
                    </p>
                    <p className="font-semibold text-[#242B31]">
                      {wp.label || "Unspecified"}
                    </p>
                  </div>
                </div>
                {idx < waypoints.length - 1 && (
                  <span className="hidden text-xs font-bold text-[#718078] sm:inline">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
