"use client";

import React, { useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { createAgriPinIcon } from "@/components/maps/leaflet-icons";
import {
  DEFAULT_INDIA_CENTER,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  isValidCoordinatePair,
} from "@/lib/maps/routing-utils";
import type { SelectedLocation } from "@/components/maps/LocationAutocomplete";

interface LeafletLocationPickerInnerProps {
  initialLocation: SelectedLocation;
  title: string;
  onConfirm: (location: SelectedLocation) => void;
  onClose: () => void;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletLocationPickerInner({
  initialLocation,
  title,
  onConfirm,
  onClose,
}: LeafletLocationPickerInnerProps) {
  const hasInitialCoords = isValidCoordinatePair(
    initialLocation.lat,
    initialLocation.lng,
  );

  const [pickedLat, setPickedLat] = useState<number | null>(
    hasInitialCoords ? initialLocation.lat! : null,
  );
  const [pickedLng, setPickedLng] = useState<number | null>(
    hasInitialCoords ? initialLocation.lng! : null,
  );
  const [label, setLabel] = useState(initialLocation.name || "");
  const [city, setCity] = useState<string | null>(initialLocation.city ?? null);
  const [stateName, setStateName] = useState<string | null>(
    initialLocation.state ?? null,
  );
  const [placeId, setPlaceId] = useState<string | null>(
    initialLocation.placeId ?? null,
  );
  const [resolving, setResolving] = useState(false);

  async function handlePointPick(lat: number, lng: number) {
    setPickedLat(lat);
    setPickedLng(lng);
    setResolving(true);
    try {
      const res = await fetch(
        `/api/geocode?lat=${encodeURIComponent(lat.toFixed(6))}&lng=${encodeURIComponent(lng.toFixed(6))}`,
      );
      const data = await res.json();
      if (data.location) {
        setLabel(data.location.name);
        setCity(data.location.city ?? null);
        setStateName(data.location.state ?? null);
        setPlaceId(data.location.placeId ?? null);
      } else if (!label.trim()) {
        setLabel(`Pinned Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch {
      if (!label.trim()) {
        setLabel(`Pinned Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } finally {
      setResolving(false);
    }
  }

  const center: [number, number] =
    pickedLat != null && pickedLng != null
      ? [pickedLat, pickedLng]
      : DEFAULT_INDIA_CENTER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="agri-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E8E2] px-5 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-[#173D32]">{title}</h3>
            <p className="text-[11px] text-[#718078]">
              Click anywhere on the map to place a pin, edit the name if needed,
              and confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E4E8E2] p-1.5 text-[#242B31] hover:bg-[#F4F5F1]"
            aria-label="Close map picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-72 w-full sm:h-80">
          <MapContainer
            center={center}
            zoom={hasInitialCoords ? 11 : 5}
            className="h-full w-full"
          >
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
            <MapClickHandler onSelect={handlePointPick} />
            {pickedLat != null && pickedLng != null && (
              <Marker
                position={[pickedLat, pickedLng]}
                icon={createAgriPinIcon("P", "picker")}
              />
            )}
          </MapContainer>
        </div>

        <div className="space-y-3 border-t border-[#E4E8E2] bg-[#F4F5F1]/60 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold text-[#242B31]">
                Selected Location Label
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#173D32]" />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Click map or enter location name..."
                  className="agri-input pl-9 text-xs"
                />
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-[#242B31]">
                Coordinates
              </span>
              <div className="flex h-[38px] items-center rounded-lg border border-[#E4E8E2] bg-white px-3 font-mono text-[11px] text-[#718078]">
                {resolving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Resolving...
                  </span>
                ) : pickedLat != null && pickedLng != null ? (
                  `${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)}`
                ) : (
                  "No pin selected"
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E4E8E2] bg-white px-4 py-2 text-xs font-semibold text-[#242B31]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pickedLat == null || pickedLng == null}
              onClick={() => {
                if (pickedLat == null || pickedLng == null) return;
                const finalName =
                  label.trim() ||
                  `Pinned Point (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`;
                onConfirm({
                  name: finalName,
                  city: city || finalName,
                  state: stateName,
                  placeId,
                  lat: pickedLat,
                  lng: pickedLng,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#244638] disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

