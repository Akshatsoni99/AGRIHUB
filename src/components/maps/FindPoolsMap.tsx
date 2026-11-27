"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Loader2,
  MapPinOff,
  Navigation,
  Weight,
} from "lucide-react";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  decodeRouteGeometry,
  isValidCoordinatePair,
} from "@/lib/maps/routing-utils";
import type { PoolMatchResult } from "@/lib/matching/route-matching";
import type { PoolListing } from "@/types/domain";
import {
  cn,
  formatCurrency,
  formatDistanceKm,
  formatDuration,
  formatShortDate,
  formatWeight,
} from "@/lib/utils";

const LeafletFindPoolsMapInner = dynamic(
  () => import("@/components/maps/LeafletFindPoolsMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#F4F5F1] text-xs font-medium text-[#718078]">
        Loading OpenStreetMap Explorer...
      </div>
    ),
  },
);

interface LazyRouteInfo {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

interface FindPoolsMapProps {
  items: { pool: PoolListing; match?: PoolMatchResult }[];
  selectedPoolId: string | null;
  onSelectPool: (poolId: string) => void;
}

export function FindPoolsMap({
  items,
  selectedPoolId,
  onSelectPool,
}: FindPoolsMapProps) {
  const [lazyRoutes, setLazyRoutes] = useState<Record<string, LazyRouteInfo>>(
    {},
  );
  const [routeErrors, setRouteErrors] = useState<Record<string, string>>({});
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);
  const attemptedPoolIds = useRef<Set<string>>(new Set());

  const mappableItems = useMemo(
    () =>
      items.filter(({ pool }) =>
        isValidCoordinatePair(pool.origin_lat, pool.origin_lng),
      ),
    [items],
  );

  const unmappedItems = useMemo(
    () =>
      items.filter(
        ({ pool }) => !isValidCoordinatePair(pool.origin_lat, pool.origin_lng),
      ),
    [items],
  );

  const activePoolId =
    selectedPoolId && mappableItems.some((i) => i.pool.id === selectedPoolId)
      ? selectedPoolId
      : mappableItems[0]?.pool.id ?? null;

  const activeItem = useMemo(
    () => mappableItems.find((i) => i.pool.id === activePoolId) ?? null,
    [mappableItems, activePoolId],
  );

  // Lazily fetch OSRM road route ONLY for the currently selected pool when it lacks stored geometry
  useEffect(() => {
    if (!activeItem) return;
    const pool = activeItem.pool;

    const hasStored = decodeRouteGeometry(pool.route_polyline).length >= 2;
    if (hasStored || lazyRoutes[pool.id] || attemptedPoolIds.current.has(pool.id)) {
      return;
    }

    if (
      !isValidCoordinatePair(pool.origin_lat, pool.origin_lng) ||
      !isValidCoordinatePair(pool.destination_lat, pool.destination_lng)
    ) {
      return;
    }

    attemptedPoolIds.current.add(pool.id);
    let cancelled = false;

    const stops = [...(pool.stops || [])]
      .sort((a, b) => a.stop_order - b.stop_order)
      .filter((s) => isValidCoordinatePair(s.lat, s.lng))
      .map((s) => ({ address: s.location_name, lat: s.lat!, lng: s.lng! }));

    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoadingRouteId(pool.id);

      fetch("/api/routes/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: {
            address: pool.origin_name,
            lat: pool.origin_lat!,
            lng: pool.origin_lng!,
          },
          destination: {
            address: pool.destination_name,
            lat: pool.destination_lat!,
            lng: pool.destination_lng!,
          },
          intermediates: stops,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data.routeFound && Array.isArray(data.coordinates)) {
            setLazyRoutes((prev) => ({
              ...prev,
              [pool.id]: {
                coordinates: data.coordinates,
                distanceMeters: data.distanceMeters,
                durationSeconds: data.durationSeconds,
              },
            }));
          } else if (data.error) {
            setRouteErrors((prev) => ({ ...prev, [pool.id]: data.error }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRouteErrors((prev) => ({
              ...prev,
              [pool.id]: "Public routing service temporarily unavailable.",
            }));
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingRouteId(null);
        });
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeItem, lazyRoutes]);

  const activeLazy = activeItem ? lazyRoutes[activeItem.pool.id] : undefined;
  const routeError = activeItem
    ? (routeErrors[activeItem.pool.id] ?? null)
    : null;
  const activeDistance =
    activeItem?.pool.route_distance_meters ?? activeLazy?.distanceMeters;
  const activeDuration =
    activeItem?.pool.route_duration_seconds ?? activeLazy?.durationSeconds;

  return (
    <div className="space-y-5">
      {mappableItems.length === 0 ? (
        <div className="agri-card p-8 text-center">
          <MapPinOff className="mx-auto mb-2.5 h-8 w-8 text-[#718078]" />
          <p className="text-sm font-bold text-[#242B31]">
            None of the matching pools have stored map coordinates
          </p>
          <p className="mt-1 text-xs text-[#718078]">
            Pools created before coordinates were captured remain accessible
            below in list form—AGRIHUB never places listings at arbitrary map
            pins.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Synchronized Scrollable Pool Selector List */}
          <div className="space-y-2.5 lg:col-span-5 lg:max-h-[540px] lg:overflow-y-auto lg:pr-1">
            {mappableItems.map(({ pool, match }, index) => {
              const selected = pool.id === activePoolId;
              return (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => onSelectPool(pool.id)}
                  className={cn(
                    "w-full rounded-xl border p-3.5 text-left transition",
                    selected
                      ? "border-[#173D32] bg-[#173D32]/5 ring-1 ring-[#173D32]"
                      : "border-[#E4E8E2] bg-white hover:border-[#173D32]/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          selected
                            ? "bg-[#D5A45B] text-[#173D32]"
                            : "bg-[#173D32] text-white",
                        )}
                      >
                        {index + 1}
                      </span>
                      <VehicleIcon
                        category={pool.vehicle_category}
                        className="h-7 w-11"
                      />
                      <span className="font-mono text-xs font-bold text-[#173D32]">
                        {pool.pool_code}
                      </span>
                    </div>
                    <StatusBadge status={pool.status} />
                  </div>

                  <p className="mt-2 text-xs font-bold text-[#242B31]">
                    {pool.origin_name} → {pool.destination_name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#718078]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#173D32]">
                      <Weight className="h-3 w-3 text-[#D5A45B]" />
                      {formatWeight(pool.available_capacity_kg)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatShortDate(pool.departure_date)}
                    </span>
                    <span className="font-bold text-[#242B31]">
                      {formatCurrency(pool.asking_price)}
                    </span>
                    {match && (
                      <span className="font-semibold text-[#1F6B48]">
                        {match.totalScore}/100
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Leaflet Map + Selected Pool Summary */}
          <div className="space-y-3 lg:col-span-7">
            <div className="agri-card overflow-hidden">
              <div className="h-80 w-full sm:h-[420px]">
                <LeafletFindPoolsMapInner
                  mappablePools={mappableItems.map((m) => m.pool)}
                  selectedPoolId={activePoolId}
                  selectedRouteCoords={activeLazy?.coordinates ?? null}
                  onSelectPool={onSelectPool}
                />
              </div>

              {activeItem && (
                <div className="flex flex-col justify-between gap-3 border-t border-[#E4E8E2] bg-white p-4 sm:flex-row sm:items-center">
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#173D32]">
                        {activeItem.pool.pool_code}
                      </span>
                      <span className="font-semibold text-[#242B31]">
                        {activeItem.pool.origin_name} →{" "}
                        {activeItem.pool.destination_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#718078]">
                      {loadingRouteId === activeItem.pool.id ? (
                        <span className="inline-flex items-center gap-1 text-[#173D32]">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calculating OSRM road route...
                        </span>
                      ) : activeDistance ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#173D32]">
                          <Navigation className="h-3 w-3 text-[#D5A45B]" />
                          {formatDistanceKm(activeDistance)}
                          {formatDuration(activeDuration)
                            ? ` • ${formatDuration(activeDuration)}`
                            : ""}
                        </span>
                      ) : routeError ? (
                        <span className="inline-flex items-center gap-1 text-[#8A611E]">
                          <AlertCircle className="h-3 w-3" />
                          {routeError}
                        </span>
                      ) : (
                        <span>
                          Destination coordinates missing or route unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/pools/${activeItem.pool.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#244638]"
                  >
                    View & Request
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Honest listing of pools that lack coordinates */}
      {unmappedItems.length > 0 && (
        <div className="agri-card space-y-3 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#242B31]">
            <MapPinOff className="h-4 w-4 text-[#D5A45B]" />
            <span>
              Pools Without Map Coordinates ({unmappedItems.length})
            </span>
          </div>
          <p className="text-[11px] text-[#718078]">
            These listings were entered without map coordinates and are shown
            here instead of placing arbitrary markers on the map.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {unmappedItems.map(({ pool }) => (
              <Link
                key={pool.id}
                href={`/pools/${pool.id}`}
                className="flex items-center justify-between rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3.5 py-2.5 text-xs hover:border-[#173D32]/40"
              >
                <div>
                  <p className="font-bold text-[#173D32]">
                    {pool.pool_code} • {pool.origin_name} →{" "}
                    {pool.destination_name}
                  </p>
                  <p className="text-[11px] text-[#718078]">
                    {formatWeight(pool.available_capacity_kg)} free •{" "}
                    {formatShortDate(pool.departure_date)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#173D32]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
