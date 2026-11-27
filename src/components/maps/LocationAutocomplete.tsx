"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, Loader2, Map as MapIcon, MapPin, Search } from "lucide-react";
import { isValidCoordinatePair } from "@/lib/maps/routing-utils";
import { cn } from "@/lib/utils";

const LeafletLocationPickerInner = dynamic(
  () => import("@/components/maps/LeafletLocationPickerInner"),
  { ssr: false },
);

export interface SelectedLocation {
  name: string;
  city?: string | null;
  state?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface GeocodeSuggestion {
  name: string;
  displayName: string;
  city: string | null;
  state: string | null;
  placeId: string | null;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  selectedLat?: number | null;
  selectedLng?: number | null;
  placeholder?: string;
  required?: boolean;
  allowMapPicker?: boolean;
  className?: string;
  onChange: (location: SelectedLocation) => void;
}

const clientGeocodeCache = new Map<string, GeocodeSuggestion[]>();

export function LocationAutocomplete({
  id,
  label,
  value,
  selectedLat,
  selectedLng,
  placeholder = "Type at least 3 letters (town, mandi, city) or pick on map",
  required = false,
  allowMapPicker = true,
  className,
  onChange,
}: LocationAutocompleteProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [suppressSearchForValue, setSuppressSearchForValue] = useState<
    string | null
  >(null);

  const hasCoords = isValidCoordinatePair(selectedLat, selectedLng);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || suppressSearchForValue === query) {
      return;
    }

    const cacheKey = query.toLowerCase();
    const cached = clientGeocodeCache.get(cacheKey);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (cached) {
        setSuggestions(cached);
        setSearchNotice(null);
        return;
      }

      setSearching(true);
      setSearchNotice(null);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        const items: GeocodeSuggestion[] = Array.isArray(data.results)
          ? data.results
          : [];
        if (items.length > 0) {
          clientGeocodeCache.set(cacheKey, items);
        }
        setSuggestions(items);
        if (data.unavailable && data.message) {
          setSearchNotice(data.message);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setSearchNotice("Location search unavailable. Use Pick on Map.");
        }
      } finally {
        setSearching(false);
      }
    }, cached ? 0 : 550);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, suppressSearchForValue]);

  function handleSelectSuggestion(item: GeocodeSuggestion) {
    setSuppressSearchForValue(item.name.trim());
    setDropdownOpen(false);
    setSuggestions([]);
    onChange({
      name: item.name,
      city: item.city,
      state: item.state,
      placeId: item.placeId,
      lat: item.lat,
      lng: item.lng,
    });
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-[#242B31]"
        >
          <span>{label}</span>
          {hasCoords ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1F6B48]">
              <CheckCircle2 className="h-3 w-3" />
              Pinned
            </span>
          ) : (
            <span className="text-[10px] font-normal text-[#718078]">
              Search or pick on map
            </span>
          )}
        </label>
      )}

      <div className="flex gap-1.5">
        <div className="relative flex-1 min-w-0">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" />
          <input
            id={id}
            type="text"
            required={required}
            value={value}
            autoComplete="off"
            onFocus={() => {
              if (suggestions.length > 0 || searchNotice) {
                setDropdownOpen(true);
              }
            }}
            onChange={(e) => {
              const nextVal = e.target.value;
              setSuppressSearchForValue(null);
              if (nextVal.trim().length >= 3) {
                setDropdownOpen(true);
              } else {
                setDropdownOpen(false);
                setSuggestions([]);
              }
              onChange({
                name: nextVal,
                city: nextVal,
                state: null,
                placeId: null,
                lat: null,
                lng: null,
              });
            }}
            placeholder={placeholder}
            className="agri-input pl-10 pr-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#718078]" />
          )}
        </div>

        {allowMapPicker && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-2 text-xs font-semibold text-[#173D32] transition hover:border-[#173D32]/40 hover:bg-white"
            title="Pick location on OpenStreetMap"
          >
            <MapIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Map</span>
          </button>
        )}
      </div>

      {hasCoords && value.trim() && (
        <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1]/80 px-2.5 py-1.5 text-[11px] text-[#242B31]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1F6B48]" />
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium leading-snug text-[#242B31]">
              {value.trim()}
            </p>
            <p className="font-mono text-[10px] text-[#718078]">
              {selectedLat!.toFixed(4)}, {selectedLng!.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {dropdownOpen &&
        value.trim().length >= 3 &&
        (suggestions.length > 0 || searchNotice) && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E4E8E2] bg-white shadow-lg">
            {searchNotice && suggestions.length === 0 && (
              <div className="px-3.5 py-2.5 text-xs text-[#718078]">
                {searchNotice}
              </div>
            )}
            {suggestions.map((item, idx) => (
              <button
                key={`${item.placeId || item.name}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="flex w-full items-start gap-2 border-b border-[#E4E8E2]/60 px-3.5 py-2.5 text-left text-xs last:border-b-0 hover:bg-[#F4F5F1]"
              >
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#173D32]" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#242B31]">{item.name}</p>
                  <p className="truncate text-[11px] text-[#718078]">
                    {item.displayName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

      {pickerOpen && (
        <LeafletLocationPickerInner
          title={label ? `Pick ${label.replace("*", "").trim()}` : "Pick Location on Map"}
          initialLocation={{
            name: value,
            lat: selectedLat,
            lng: selectedLng,
          }}
          onClose={() => setPickerOpen(false)}
          onConfirm={(loc) => {
            setSuppressSearchForValue(loc.name.trim());
            setPickerOpen(false);
            setDropdownOpen(false);
            onChange(loc);
          }}
        />
      )}
    </div>
  );
}
