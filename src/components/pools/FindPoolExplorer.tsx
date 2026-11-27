"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  LayoutList,
  Map as MapIcon,
  PlusCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { VehicleCategorySelector } from "@/components/pools/VehicleCategorySelector";
import { PoolCard } from "@/components/pools/PoolCard";
import { FindPoolsMap } from "@/components/maps/FindPoolsMap";
import {
  LocationAutocomplete,
  type SelectedLocation,
} from "@/components/maps/LocationAutocomplete";
import { EmptyState } from "@/components/ui/EmptyState";
import { CARGO_CATEGORIES } from "@/lib/constants/cargo";
import { evaluatePoolMatch } from "@/lib/matching/route-matching";
import type {
  CargoCategory,
  PoolListing,
  PoolStatus,
  VehicleCategory,
} from "@/types/domain";

interface FindPoolExplorerProps {
  initialPools: PoolListing[];
}

type SortOption =
  | "best_match"
  | "lowest_price"
  | "earliest_departure"
  | "highest_capacity";

const VALID_VEHICLE_CATEGORIES: VehicleCategory[] = [
  "cargo_auto",
  "e_cargo_auto",
  "pickup_truck",
  "loading_van",
  "heavy_truck",
];

export function FindPoolExplorer({ initialPools }: FindPoolExplorerProps) {
  const searchParams = useSearchParams();
  const initialVehicleParam = searchParams.get("vehicle") as
    | VehicleCategory
    | null;
  const initialOriginParam = searchParams.get("origin") || "";
  const initialDestParam = searchParams.get("destination") || "";
  const initialCapParam = searchParams.get("capacity") || "";
  const initialCargoParam = searchParams.get("cargo") as CargoCategory | null;

  const [vehicleCategory, setVehicleCategory] = useState<
    VehicleCategory | "all"
  >(
    initialVehicleParam &&
      VALID_VEHICLE_CATEGORIES.includes(initialVehicleParam)
      ? initialVehicleParam
      : "all",
  );
  const [originLoc, setOriginLoc] = useState<SelectedLocation>({
    name: initialOriginParam,
  });
  const [destLoc, setDestLoc] = useState<SelectedLocation>({
    name: initialDestParam,
  });
  const [departureDate, setDepartureDate] = useState("");
  const [requiredCapacity, setRequiredCapacity] = useState(initialCapParam);
  const [cargoCategory, setCargoCategory] = useState<CargoCategory | "all">(
    initialCargoParam || "all",
  );
  const [maxPrice, setMaxPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<PoolStatus | "all">("OPEN");
  const [stopQuery, setStopQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("best_match");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  function resetFilters() {
    setVehicleCategory("all");
    setOriginLoc({ name: "" });
    setDestLoc({ name: "" });
    setDepartureDate("");
    setRequiredCapacity("");
    setCargoCategory("all");
    setMaxPrice("");
    setStatusFilter("OPEN");
    setStopQuery("");
    setSortBy("best_match");
  }

  const scoredAndFiltered = useMemo(() => {
    const reqKg = Number(requiredCapacity) || 0;
    const maxBudget = Number(maxPrice) || 0;
    const stopNeedle = stopQuery.trim().toLowerCase();

    const filtered = initialPools.filter((pool) => {
      if (statusFilter !== "all" && pool.status !== statusFilter) return false;
      if (
        vehicleCategory !== "all" &&
        pool.vehicle_category !== vehicleCategory
      ) {
        return false;
      }
      if (reqKg > 0 && pool.available_capacity_kg < reqKg) return false;
      if (
        cargoCategory !== "all" &&
        pool.main_cargo_category !== cargoCategory &&
        !pool.permitted_cargo_categories.includes(cargoCategory)
      ) {
        return false;
      }
      if (departureDate && pool.departure_date !== departureDate) return false;
      if (maxBudget > 0 && pool.asking_price > maxBudget) return false;
      if (stopNeedle) {
        const matchesStop =
          pool.origin_name.toLowerCase().includes(stopNeedle) ||
          pool.destination_name.toLowerCase().includes(stopNeedle) ||
          (pool.stops || []).some((s) =>
            s.location_name.toLowerCase().includes(stopNeedle),
          );
        if (!matchesStop) return false;
      }
      return true;
    });

    const hasSearchContext =
      Boolean(originLoc.name.trim()) ||
      Boolean(destLoc.name.trim()) ||
      reqKg > 0 ||
      Boolean(departureDate) ||
      cargoCategory !== "all" ||
      vehicleCategory !== "all" ||
      maxBudget > 0;

    const withMatches = filtered.map((pool) => ({
      pool,
      match: hasSearchContext
        ? evaluatePoolMatch(pool, {
          origin: originLoc.name,
          originLat: originLoc.lat,
          originLng: originLoc.lng,
          destination: destLoc.name,
          destinationLat: destLoc.lat,
          destinationLng: destLoc.lng,
          vehicleCategory,
          requiredCapacityKg: reqKg > 0 ? reqKg : undefined,
          departureDate: departureDate || undefined,
          cargoCategory,
          maxPrice: maxBudget > 0 ? maxBudget : undefined,
        })
        : undefined,
    }));

    withMatches.sort((a, b) => {
      if (sortBy === "lowest_price") {
        return a.pool.asking_price - b.pool.asking_price;
      }
      if (sortBy === "earliest_departure") {
        return `${a.pool.departure_date} ${a.pool.departure_time}`.localeCompare(
          `${b.pool.departure_date} ${b.pool.departure_time}`,
        );
      }
      if (sortBy === "highest_capacity") {
        return b.pool.available_capacity_kg - a.pool.available_capacity_kg;
      }
      // best_match
      const scoreA = a.match?.totalScore ?? 50;
      const scoreB = b.match?.totalScore ?? 50;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.pool.departure_date.localeCompare(b.pool.departure_date);
    });

    return withMatches;
  }, [
    initialPools,
    statusFilter,
    vehicleCategory,
    requiredCapacity,
    cargoCategory,
    departureDate,
    maxPrice,
    stopQuery,
    originLoc,
    destLoc,
    sortBy,
  ]);

  const filterFormContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4E8E2] pb-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#173D32]">
          <Filter className="h-3.5 w-3.5" />
          Route & Load Filters
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#718078] hover:text-[#173D32]"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <LocationAutocomplete
        id="find-origin"
        label="Pickup / Origin"
        value={originLoc.name}
        selectedLat={originLoc.lat}
        selectedLng={originLoc.lng}
        placeholder="e.g. Jaipur, Nashik..."
        onChange={setOriginLoc}
      />

      <LocationAutocomplete
        id="find-destination"
        label="Drop / Destination"
        value={destLoc.name}
        selectedLat={destLoc.lat}
        selectedLng={destLoc.lng}
        placeholder="e.g. Ajmer, Pune..."
        onChange={setDestLoc}
      />

      <div>
        <label
          htmlFor="find-stop"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Intermediate Stop Keyword
        </label>
        <input
          id="find-stop"
          type="text"
          value={stopQuery}
          onChange={(e) => setStopQuery(e.target.value)}
          placeholder="Town or mandi along route"
          className="agri-input"
        />
      </div>

      <div>
        <label
          htmlFor="find-cap"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Required Cargo Capacity (kg)
        </label>
        <input
          id="find-cap"
          type="number"
          min={1}
          value={requiredCapacity}
          onChange={(e) => setRequiredCapacity(e.target.value)}
          placeholder="e.g. 500"
          className="agri-input"
        />
      </div>

      <div>
        <label
          htmlFor="find-date"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Departure Date
        </label>
        <input
          id="find-date"
          type="date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
          className="agri-input"
        />
      </div>

      <div>
        <label
          htmlFor="find-cargo"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Cargo Category
        </label>
        <select
          id="find-cargo"
          value={cargoCategory}
          onChange={(e) =>
            setCargoCategory(e.target.value as CargoCategory | "all")
          }
          className="agri-input"
        >
          <option value="all">All Cargo Categories</option>
          {CARGO_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="find-max-price"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Maximum Asking Price (₹)
        </label>
        <input
          id="find-max-price"
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="No limit"
          className="agri-input"
        />
      </div>

      <div>
        <label
          htmlFor="find-status"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Availability Status
        </label>
        <select
          id="find-status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PoolStatus | "all")
          }
          className="agri-input"
        >
          <option value="OPEN">Open Pools Only</option>
          <option value="FULL">Full Pools</option>
          <option value="all">All Published</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Vehicle Category Filter Strip */}
      <VehicleCategorySelector
        value={vehicleCategory}
        onChange={setVehicleCategory}
        includeAllOption
        compact
      />

      {/* Sort, View Mode Toggle & Mobile Filter Trigger Bar */}
      <div className="agri-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-1.5 text-xs font-semibold text-[#242B31] lg:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#173D32]" />
            Filters
          </button>
          <p className="text-xs font-medium text-[#718078]">
            Showing{" "}
            <strong className="text-[#242B31]">
              {scoredAndFiltered.length}
            </strong>{" "}
            matching pool{scoredAndFiltered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-0.5"
            role="group"
            aria-label="Results view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${viewMode === "list"
                  ? "bg-[#173D32] text-white shadow-xs"
                  : "text-[#242B31] hover:text-[#173D32]"
                }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              LIST VIEW
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${viewMode === "map"
                  ? "bg-[#173D32] text-white shadow-xs"
                  : "text-[#242B31] hover:text-[#173D32]"
                }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              MAP VIEW
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="sort-pools"
              className="text-xs font-semibold text-[#718078]"
            >
              Sort:
            </label>
            <select
              id="sort-pools"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-[#E4E8E2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#242B31]"
            >
              <option value="best_match">Best route match</option>
              <option value="lowest_price">Lowest contribution</option>
              <option value="earliest_departure">Earliest departure</option>
              <option value="highest_capacity">Highest available capacity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split: Desktop Sidebar + Pool Results (List or Map) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="agri-card sticky top-20 p-5">
            {filterFormContent}
          </div>
        </aside>

        <div className="lg:col-span-9">
          {scoredAndFiltered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching truck pools found"
              description="Try widening your cargo weight, departure date, or route filters—or publish a new pool if you operate on this route."
              actionLabel="Reset Filters"
              actionHref="/truck-pool/find"
              secondaryLabel="Create a Pool"
              secondaryHref={
                vehicleCategory === "all"
                  ? "/truck-pool/create"
                  : `/truck-pool/create?vehicle=${vehicleCategory}`
              }
            />
          ) : viewMode === "map" ? (
            <FindPoolsMap
              items={scoredAndFiltered}
              selectedPoolId={selectedPoolId}
              onSelectPool={setSelectedPoolId}
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {scoredAndFiltered.map(({ pool, match }) => {
                const isSelected = selectedPoolId === pool.id;
                return (
                  <div
                    key={pool.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={
                      isSelected
                        ? "rounded-xl ring-2 ring-[#173D32] ring-offset-2"
                        : undefined
                    }
                  >
                    <PoolCard pool={pool} match={match} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45 lg:hidden">
          <div className="h-full w-full max-w-xs overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-[#173D32]">
                Filter Truck Pools
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-lg border border-[#E4E8E2] p-1.5 text-[#242B31]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterFormContent}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-lg bg-[#173D32] py-2.5 text-xs font-semibold text-white"
              >
                Apply Filters ({scoredAndFiltered.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href={
            vehicleCategory === "all"
              ? "/truck-pool/create"
              : `/truck-pool/create?vehicle=${vehicleCategory}`
          }
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D32] hover:underline"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Have unused space on this route? Create a Pool
        </Link>
      </div>
    </div>
  );
}

