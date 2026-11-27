"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { loadGoogleMapsApi } from "@/lib/maps/google-loader";
import type {
  GoogleGeocoderAddressComponent,
  GoogleMapsEventListener,
} from "@/lib/maps/google-types";
import { getGoogleMapsBrowserConfig } from "@/lib/env";
import { cn } from "@/lib/utils";

export interface SelectedLocation {
  name: string;
  city?: string | null;
  state?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface LocationAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onChange: (location: SelectedLocation) => void;
}

function extractAddressComponent(
  components: GoogleGeocoderAddressComponent[] | undefined,
  types: string[],
): string | null {
  if (!components) return null;
  const match = components.find((comp) =>
    types.some((t) => comp.types.includes(t)),
  );
  return match?.long_name ?? null;
}

export function LocationAutocomplete({
  id,
  label,
  value,
  placeholder = "Enter town, mandi, or city",
  required = false,
  className,
  onChange,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const { isConfigured } = getGoogleMapsBrowserConfig();

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    let listener: GoogleMapsEventListener | null = null;

    loadGoogleMapsApi().then((maps) => {
      if (!active || !maps || !inputRef.current || !maps.places) return;
      setMapsReady(true);

      const autocomplete = new maps.places.Autocomplete(inputRef.current, {
        fields: [
          "formatted_address",
          "name",
          "geometry",
          "place_id",
          "address_components",
        ],
        types: ["geocode"],
      });

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const city =
          extractAddressComponent(place.address_components, [
            "locality",
            "administrative_area_level_2",
          ]) ||
          place.name ||
          null;
        const state = extractAddressComponent(place.address_components, [
          "administrative_area_level_1",
        ]);
        const lat = place.geometry?.location?.lat() ?? null;
        const lng = place.geometry?.location?.lng() ?? null;
        const displayName = place.name || place.formatted_address || "";

        onChange({
          name: displayName,
          city,
          state,
          placeId: place.place_id ?? null,
          lat,
          lng,
        });
      });
    });

    return () => {
      active = false;
      if (listener) {
        listener.remove();
      }
    };
  }, [isConfigured, onChange]);

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#242B31]"
        >
          <span>{label}</span>
          <span className="text-[10px] font-normal text-[#718078]">
            {mapsReady ? "Places active" : "Manual input"}
          </span>
        </label>
      )}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          value={value}
          onChange={(e) =>
            onChange({
              name: e.target.value,
              city: e.target.value,
              state: null,
              placeId: null,
              lat: null,
              lng: null,
            })
          }
          placeholder={placeholder}
          className={cn("agri-input pl-9")}
        />
      </div>
    </div>
  );
}
