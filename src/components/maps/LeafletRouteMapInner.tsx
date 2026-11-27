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
import type { RouteMapWaypoint } from "@/components/maps/RouteMap";

interface LeafletRouteMapInnerProps {
  waypoints: RouteMapWaypoint[];
  encodedPolyline?: string | null;
  routeCoordinates?: [number, number][] | null;
}

function FitBoundsController({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
  }, [map, points]);

  return null;
}

export default function LeafletRouteMapInner({
  waypoints,
  encodedPolyline,
  routeCoordinates,
}: LeafletRouteMapInnerProps) {
  const validWaypoints = useMemo(
    () =>
      waypoints.filter((w) => isValidCoordinatePair(w.lat, w.lng)) as (RouteMapWaypoint & {
        lat: number;
        lng: number;
      })[],
    [waypoints],
  );

  const roadPath = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length >= 2) {
      return routeCoordinates;
    }
    return decodeRouteGeometry(encodedPolyline);
  }, [routeCoordinates, encodedPolyline]);

  const allBoundsPoints = useMemo(() => {
    const pts: [number, number][] = validWaypoints.map((w) => [w.lat, w.lng]);
    if (roadPath.length >= 2) {
      pts.push(...roadPath);
    }
    return pts;
  }, [validWaypoints, roadPath]);

  const initialCenter: [number, number] =
    validWaypoints.length > 0
      ? [validWaypoints[0].lat, validWaypoints[0].lng]
      : DEFAULT_INDIA_CENTER;

  return (
    <MapContainer
      center={initialCenter}
      zoom={7}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <FitBoundsController points={allBoundsPoints} />

      {validWaypoints.map((wp, idx) => {
        const label =
          wp.role === "origin"
            ? "A"
            : wp.role === "destination"
              ? "B"
              : String(idx);
        const icon = createAgriPinIcon(label, wp.role);
        return (
          <Marker key={`${wp.label}-${idx}`} position={[wp.lat, wp.lng]} icon={icon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-[#173D32] uppercase">
                  {wp.role === "stop" ? `Stop ${idx}` : wp.role}
                </p>
                <p className="font-semibold text-[#242B31]">{wp.label}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Draw road-following OSRM route geometry only (never fabricate straight lines) */}
      {roadPath.length >= 2 && (
        <Polyline
          positions={roadPath}
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

