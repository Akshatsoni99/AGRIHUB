"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, MapPin, Navigation } from "lucide-react";
import { loadGoogleMapsApi } from "@/lib/maps/google-loader";
import { getGoogleMapsBrowserConfig } from "@/lib/env";
import { decodeEncodedPolyline } from "@/lib/matching/route-matching";
import { cn } from "@/lib/utils";

export interface RouteMapWaypoint {
  label: string;
  lat?: number | null;
  lng?: number | null;
  role: "origin" | "stop" | "destination";
}

interface RouteMapProps {
  waypoints: RouteMapWaypoint[];
  encodedPolyline?: string | null;
  heightClassName?: string;
  className?: string;
}

export function RouteMap({
  waypoints,
  encodedPolyline,
  heightClassName = "h-72 sm:h-80",
  className,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isConfigured } = getGoogleMapsBrowserConfig();
  const [mapReady, setMapReady] = useState(false);

  const coordWaypoints = useMemo(
    () => waypoints.filter((w) => w.lat != null && w.lng != null),
    [waypoints],
  );
  const canRenderGoogleMap = isConfigured && coordWaypoints.length > 0;

  useEffect(() => {
    if (!canRenderGoogleMap) {
      return;
    }

    let cancelled = false;

    loadGoogleMapsApi().then((maps) => {
      if (cancelled || !maps || !containerRef.current) {
        return;
      }

      const first = coordWaypoints[0];
      const map = new maps.Map(containerRef.current, {
        center: { lat: first.lat!, lng: first.lng! },
        zoom: 7,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      const bounds = new maps.LatLngBounds();

      coordWaypoints.forEach((wp, idx) => {
        const pos = { lat: wp.lat!, lng: wp.lng! };
        bounds.extend(pos);
        new maps.Marker({
          position: pos,
          map,
          title: wp.label,
          label:
            wp.role === "origin"
              ? "A"
              : wp.role === "destination"
                ? "B"
                : String(idx),
        });
      });

      if (encodedPolyline) {
        const path = decodeEncodedPolyline(encodedPolyline);
        if (path.length >= 2) {
          new maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#173D32",
            strokeOpacity: 0.9,
            strokeWeight: 4,
            map,
          });
          path.forEach((pt) => bounds.extend(pt));
        }
      } else if (coordWaypoints.length >= 2) {
        new maps.Polyline({
          path: coordWaypoints.map((w) => ({ lat: w.lat!, lng: w.lng! })),
          geodesic: true,
          strokeColor: "#D5A45B",
          strokeOpacity: 0.85,
          strokeWeight: 3,
          map,
        });
      }

      map.fitBounds(bounds, 48);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [canRenderGoogleMap, encodedPolyline, coordWaypoints]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#E4E8E2] bg-[#F4F5F1]",
        className,
      )}
    >
      {canRenderGoogleMap ? (
        <div className={cn("relative w-full", heightClassName)}>
          <div ref={containerRef} className="h-full w-full" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#F4F5F1] text-xs font-medium text-[#718078]">
              Loading interactive route map...
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#E4E8E2] pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#173D32]">
              <Navigation className="h-4 w-4 text-[#D5A45B]" />
              <span>Declared Corridor Stops (Text Route View)</span>
            </div>
            {!isConfigured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D5A45B]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#8A611E]">
                <AlertCircle className="h-3 w-3" />
                Google Maps key not configured
              </span>
            )}
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

