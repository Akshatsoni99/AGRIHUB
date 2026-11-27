"use client";

import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  LocationAutocomplete,
  type SelectedLocation,
} from "@/components/maps/LocationAutocomplete";

export interface StopDraft {
  location_name: string;
  city: string | null;
  state: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  estimated_time: string | null;
}

interface StopSelectorProps {
  stops: StopDraft[];
  onChange: (stops: StopDraft[]) => void;
  maxStops?: number;
}

export function StopSelector({
  stops,
  onChange,
  maxStops = 8,
}: StopSelectorProps) {
  function addStop() {
    if (stops.length >= maxStops) return;
    onChange([
      ...stops,
      {
        location_name: "",
        city: null,
        state: null,
        place_id: null,
        lat: null,
        lng: null,
        estimated_time: "",
      },
    ]);
  }

  function updateStop(index: number, loc: SelectedLocation) {
    const next = [...stops];
    next[index] = {
      ...next[index],
      location_name: loc.name,
      city: loc.city ?? null,
      state: loc.state ?? null,
      place_id: loc.placeId ?? null,
      lat: loc.lat ?? null,
      lng: loc.lng ?? null,
    };
    onChange(next);
  }

  function updateStopTime(index: number, estimatedTime: string) {
    const next = [...stops];
    next[index] = { ...next[index], estimated_time: estimatedTime };
    onChange(next);
  }

  function removeStop(index: number) {
    onChange(stops.filter((_, i) => i !== index));
  }

  function moveStop(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#242B31]">
            Intermediate Stops (Optional)
          </span>
          <p className="text-[11px] text-[#718078]">
            Add towns or mandis along your corridor so shippers on the way can
            match with your route.
          </p>
        </div>
        {stops.length < maxStops && (
          <button
            type="button"
            onClick={addStop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#173D32]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Stop
          </button>
        )}
      </div>

      {stops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E4E8E2] bg-[#F4F5F1]/60 px-4 py-3 text-xs text-[#718078]">
          No intermediate stops added. Direct point-to-point route.
        </div>
      ) : (
        <div className="space-y-2.5">
          {stops.map((stop, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1]/50 p-3 sm:flex-row sm:items-end"
            >
              <div className="flex items-center gap-2 sm:pb-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#173D32] text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
              </div>

              <div className="flex-1">
                <LocationAutocomplete
                  id={`stop-loc-${idx}`}
                  value={stop.location_name}
                  selectedLat={stop.lat}
                  selectedLng={stop.lng}
                  placeholder={`Stop ${idx + 1} town or market`}
                  onChange={(loc) => updateStop(idx, loc)}
                />
              </div>

              <div className="w-full sm:w-36">
                <input
                  type="text"
                  value={stop.estimated_time || ""}
                  onChange={(e) => updateStopTime(idx, e.target.value)}
                  placeholder="Est. time (e.g. 11:30)"
                  className="agri-input"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveStop(idx, -1)}
                  disabled={idx === 0}
                  className="rounded-lg border border-[#E4E8E2] bg-white p-2 text-[#242B31] disabled:opacity-40"
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStop(idx, 1)}
                  disabled={idx === stops.length - 1}
                  className="rounded-lg border border-[#E4E8E2] bg-white p-2 text-[#242B31] disabled:opacity-40"
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(idx)}
                  className="rounded-lg border border-[#B83B3B]/30 bg-white p-2 text-[#B83B3B] hover:bg-[#B83B3B]/10"
                  title="Remove stop"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

