"use client";

import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { createAgriPinIcon } from "@/components/maps/leaflet-icons";
import {
  DEFAULT_INDIA_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  decodeRouteGeometry,
  isValidCoordinatePair,
} from "@/lib/maps/routing-utils";
import type { PoolListing } from "@/types/domain";
import { formatCurrency, formatWeight } from "@/lib/utils";

interface LeafletFindPoolsMapInnerProps {
  mappablePools: PoolListing[];
  selectedPoolId: string | null;
  selectedRouteCoords: [number, number][] | null;
  onSelectPool: (poolId: string) => void;
}

function BoundsSync({
  mappablePools,
  selectedPool,
  selectedRouteCoords,
}: {
  mappablePools: PoolListing[];
  selectedPool: PoolListing | null;
  selectedRouteCoords: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const pts: [number, number][] = [];

    if (selectedPool) {
      if (isValidCoordinatePair(selectedPool.origin_lat, selectedPool.origin_lng)) {
        pts.push([selectedPool.origin_lat!, selectedPool.origin_lng!]);
      }
      if (
        isValidCoordinatePair(
          selectedPool.destination_lat,
          selectedPool.destination_lng,
        )
      ) {
        pts.push([selectedPool.destination_lat!, selectedPool.destination_lng!]);
      }
      if (selectedRouteCoords && selectedRouteCoords.length >= 2) {
        pts.push(...selectedRouteCoords);
      }
    } else {
      for (const p of mappablePools) {
        if (isValidCoordinatePair(p.origin_lat, p.origin_lng)) {
          pts.push([p.origin_lat!, p.origin_lng!]);
        }
        if (isValidCoordinatePair(p.destination_lat, p.destination_lng)) {
          pts.push([p.destination_lat!, p.destination_lng!]);
        }
      }
    }

    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 10, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(pts.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, mappablePools, selectedPool, selectedRouteCoords]);

  return null;
}

export default function LeafletFindPoolsMapInner({
  mappablePools,
  selectedPoolId,
  selectedRouteCoords,
  onSelectPool,
}: LeafletFindPoolsMapInnerProps) {
  const selectedPool = useMemo(
    () => mappablePools.find((p) => p.id === selectedPoolId) ?? null,
    [mappablePools, selectedPoolId],
  );

  const activePolyline = useMemo(() => {
    if (selectedRouteCoords && selectedRouteCoords.length >= 2) {
      return selectedRouteCoords;
    }
    if (selectedPool?.route_polyline) {
      return decodeRouteGeometry(selectedPool.route_polyline);
    }
    return [];
  }, [selectedPool, selectedRouteCoords]);

  return (
    <MapContainer
      center={DEFAULT_INDIA_CENTER}
      zoom={5}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <BoundsSync
        mappablePools={mappablePools}
        selectedPool={selectedPool}
        selectedRouteCoords={activePolyline}
      />

      {mappablePools.map((pool, index) => {
        if (!isValidCoordinatePair(pool.origin_lat, pool.origin_lng)) {
          return null;
        }
        const isSelected = pool.id === selectedPoolId;
        const icon = createAgriPinIcon(
          String(index + 1),
          isSelected ? "selected" : "origin",
        );

        return (
          <Marker
            key={`pool-origin-${pool.id}`}
            position={[pool.origin_lat!, pool.origin_lng!]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectPool(pool.id),
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-mono font-bold text-[#173D32]">
                  {pool.pool_code}
                </p>
                <p className="font-semibold text-[#242B31]">
                  {pool.origin_name} → {pool.destination_name}
                </p>
                <p className="text-[#718078]">
                  {formatWeight(pool.available_capacity_kg)} free •{" "}
                  {formatCurrency(pool.asking_price)}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Destination & intermediate stop markers for the currently selected pool */}
      {selectedPool &&
        (selectedPool.stops || [])
          .filter((s) => isValidCoordinatePair(s.lat, s.lng))
          .sort((a, b) => a.stop_order - b.stop_order)
          .map((stop) => (
            <Marker
              key={`selected-stop-${stop.id}`}
              position={[stop.lat!, stop.lng!]}
              icon={createAgriPinIcon(String(stop.stop_order), "stop")}
            >
              <Popup>
                <p className="text-xs font-semibold">
                  Stop {stop.stop_order}: {stop.location_name}
                </p>
              </Popup>
            </Marker>
          ))}

      {selectedPool &&
        isValidCoordinatePair(
          selectedPool.destination_lat,
          selectedPool.destination_lng,
        ) && (
          <Marker
            position={[
              selectedPool.destination_lat!,
              selectedPool.destination_lng!,
            ]}
            icon={createAgriPinIcon("B", "destination")}
          >
            <Popup>
              <p className="text-xs font-semibold">
                Destination: {selectedPool.destination_name}
              </p>
            </Popup>
          </Marker>
        )}

      {/* Actual OSRM road route for selected pool */}
      {activePolyline.length >= 2 && (
        <Polyline
          positions={activePolyline}
          pathOptions={{
            color: "#173D32",
            weight: 4.5,
            opacity: 0.9,
          }}
        />
      )}
    </MapContainer>
  );
}

