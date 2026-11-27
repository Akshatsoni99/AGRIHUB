"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { VehicleCategorySelector } from "@/components/pools/VehicleCategorySelector";
import {
  LocationAutocomplete,
  type SelectedLocation,
} from "@/components/maps/LocationAutocomplete";
import {
  StopSelector,
  type StopDraft,
} from "@/components/maps/StopSelector";
import { RouteMap, type RouteMapWaypoint } from "@/components/maps/RouteMap";
import { RouteSummary } from "@/components/maps/RouteSummary";
import {
  VEHICLE_CATEGORY_MAP,
  validateCapacityAgainstVehicleCategory,
} from "@/lib/constants/vehicles";
import { CARGO_CATEGORIES, PRICING_MODES } from "@/lib/constants/cargo";
import { createPoolSchema } from "@/lib/validators/pool";
import type {
  CargoCategory,
  PricingMode,
  PublicProfile,
  VehicleCategory,
} from "@/types/domain";
import { formatCurrency, formatWeight } from "@/lib/utils";
import { toast } from "sonner";

interface CreatePoolFormProps {
  userId: string;
  profile: PublicProfile | null;
}

const VALID_VEHICLE_CATEGORIES: VehicleCategory[] = [
  "cargo_auto",
  "e_cargo_auto",
  "pickup_truck",
  "loading_van",
  "heavy_truck",
];

export function CreatePoolForm({ userId, profile }: CreatePoolFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCatParam = searchParams.get("vehicle") as VehicleCategory | null;
  const initialCategory: VehicleCategory =
    initialCatParam && VALID_VEHICLE_CATEGORIES.includes(initialCatParam)
      ? initialCatParam
      : "pickup_truck";

  // Section A: Vehicle Information
  const [vehicleCategory, setVehicleCategory] =
    useState<VehicleCategory>(initialCategory);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [totalCapacityKg, setTotalCapacityKg] = useState<string>(
    String(VEHICLE_CATEGORY_MAP[initialCategory].suggestedCapacityKg),
  );
  const [existingOccupiedKg, setExistingOccupiedKg] = useState<string>("0");

  // Section B: Route Information
  const [origin, setOrigin] = useState<SelectedLocation>({ name: "" });
  const [destination, setDestination] = useState<SelectedLocation>({ name: "" });
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [departureDate, setDepartureDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [departureTime, setDepartureTime] = useState("08:00");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [pickupFlexibility, setPickupFlexibility] = useState(
    "Up to 5 km off highway route",
  );
  const [deliveryFlexibility, setDeliveryFlexibility] = useState(
    "Drop at destination mandi or highway junction",
  );
  const [routePreferences, setRoutePreferences] = useState("");
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    [number, number][] | null
  >(null);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(
    null,
  );
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<
    number | null
  >(null);
  const [routeSource, setRouteSource] = useState<"osrm" | "manual">("manual");
  const [routeStatusMessage, setRouteStatusMessage] = useState<string | null>(
    null,
  );
  const [computingRoute, setComputingRoute] = useState(false);
  const lastCalculatedSignature = useRef<string | null>(null);

  // Section C: Cargo Information
  const [mainCargoCategory, setMainCargoCategory] =
    useState<CargoCategory>("grains");
  const [cargoDescription, setCargoDescription] = useState("");
  const [permittedCategories, setPermittedCategories] = useState<
    CargoCategory[]
  >(["agriculture", "grains", "packaged_goods"]);
  const [handlingRequirements, setHandlingRequirements] = useState("");
  const [cargoDimensions, setCargoDimensions] = useState("");

  // Section D: Commercial Details
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    "fixed_contribution",
  );
  const [askingPrice, setAskingPrice] = useState("1500");
  const [pickupContribution, setPickupContribution] = useState("0");
  const [commercialTerms, setCommercialTerms] = useState("");

  // Preview & submission
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const parsedTotal = Number(totalCapacityKg) || 0;
  const parsedOccupied = Number(existingOccupiedKg) || 0;
  const availableCapacity = parsedTotal - parsedOccupied;
  const vehicleSpec = VEHICLE_CATEGORY_MAP[vehicleCategory];
  const capacityCheck = validateCapacityAgainstVehicleCategory(
    vehicleCategory,
    parsedTotal,
  );

  const mapWaypoints: RouteMapWaypoint[] = useMemo(() => {
    const items: RouteMapWaypoint[] = [
      {
        label: origin.name || "Origin",
        lat: origin.lat,
        lng: origin.lng,
        role: "origin",
      },
    ];
    stops.forEach((s, i) => {
      if (s.location_name.trim()) {
        items.push({
          label: s.location_name || `Stop ${i + 1}`,
          lat: s.lat,
          lng: s.lng,
          role: "stop",
        });
      }
    });
    items.push({
      label: destination.name || "Destination",
      lat: destination.lat,
      lng: destination.lng,
      role: "destination",
    });
    return items;
  }, [origin, destination, stops]);

  function handleCategorySelect(next: VehicleCategory | "all") {
    if (next === "all") return;
    setVehicleCategory(next);
    setTotalCapacityKg(String(VEHICLE_CATEGORY_MAP[next].suggestedCapacityKg));
  }

  function togglePermittedCargo(cat: CargoCategory) {
    setPermittedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  const routeWaypointSignature = useMemo(() => {
    if (
      origin.lat == null ||
      origin.lng == null ||
      destination.lat == null ||
      destination.lng == null
    ) {
      return null;
    }
    const stopSig = stops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => `${s.lat!.toFixed(5)},${s.lng!.toFixed(5)}`)
      .join("|");
    return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}>${stopSig}>${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
  }, [origin.lat, origin.lng, destination.lat, destination.lng, stops]);

  const computeRoadRoute = useCallback(
    async (silent = false) => {
      if (
        origin.lat == null ||
        origin.lng == null ||
        destination.lat == null ||
        destination.lng == null
      ) {
        if (!silent) {
          toast.error(
            "Select origin and destination from search results or pick them on the map first.",
          );
        }
        return;
      }

      setComputingRoute(true);
      setRouteStatusMessage(null);
      try {
        const res = await fetch("/api/routes/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: {
              address: origin.name,
              lat: origin.lat,
              lng: origin.lng,
            },
            destination: {
              address: destination.name,
              lat: destination.lat,
              lng: destination.lng,
            },
            intermediates: stops
              .filter((s) => s.lat != null && s.lng != null)
              .map((s) => ({
                address: s.location_name,
                lat: s.lat!,
                lng: s.lng!,
              })),
          }),
        });

        const data = await res.json();
        if (data.routeFound && data.encodedPolyline) {
          setRouteSource("osrm");
          setRoutePolyline(data.encodedPolyline);
          setRouteCoordinates(
            Array.isArray(data.coordinates) ? data.coordinates : null,
          );
          setRouteDistanceMeters(data.distanceMeters ?? null);
          setRouteDurationSeconds(data.durationSeconds ?? null);
          setRouteStatusMessage(null);
          if (!silent) {
            toast.success("Road route calculated via OSRM");
          }
        } else {
          setRouteSource("manual");
          setRoutePolyline(null);
          setRouteCoordinates(null);
          setRouteDistanceMeters(null);
          setRouteDurationSeconds(null);
          const msg =
            data.error ||
            "No road route found between the selected points.";
          setRouteStatusMessage(msg);
          if (!silent) {
            toast.error(msg);
          }
        }
      } catch {
        setRouteSource("manual");
        setRoutePolyline(null);
        setRouteCoordinates(null);
        setRouteDistanceMeters(null);
        setRouteDurationSeconds(null);
        const msg =
          "Public OSRM routing server is temporarily unreachable. Coordinates are still saved.";
        setRouteStatusMessage(msg);
        if (!silent) {
          toast.error(msg);
        }
      } finally {
        setComputingRoute(false);
      }
    },
    [origin.name, origin.lat, origin.lng, destination.name, destination.lat, destination.lng, stops],
  );

  // Automatically recalculate OSRM road route when confirmed coordinates or stop order change
  useEffect(() => {
    if (!routeWaypointSignature) {
      lastCalculatedSignature.current = null;
      return;
    }
    if (lastCalculatedSignature.current === routeWaypointSignature) {
      return;
    }
    const timer = setTimeout(() => {
      lastCalculatedSignature.current = routeWaypointSignature;
      computeRoadRoute(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [routeWaypointSignature, computeRoadRoute]);

  function validateFormInput() {
    const cleanStops = stops.filter((s) => s.location_name.trim().length > 0);
    return createPoolSchema.safeParse({
      vehicle_category: vehicleCategory,
      registration_number: registrationNumber,
      make_model: makeModel || null,
      vehicle_notes: vehicleNotes || null,
      ownership_confirmed: ownershipConfirmed,
      total_capacity_kg: parsedTotal,
      existing_occupied_kg: parsedOccupied,

      origin_name: origin.name,
      origin_city: origin.city || origin.name,
      origin_state: origin.state || null,
      origin_place_id: origin.placeId || null,
      origin_lat: origin.lat ?? null,
      origin_lng: origin.lng ?? null,

      destination_name: destination.name,
      destination_city: destination.city || destination.name,
      destination_state: destination.state || null,
      destination_place_id: destination.placeId || null,
      destination_lat: destination.lat ?? null,
      destination_lng: destination.lng ?? null,

      stops: cleanStops,

      departure_date: departureDate,
      departure_time: departureTime,
      estimated_arrival: estimatedArrival
        ? new Date(estimatedArrival).toISOString()
        : null,
      pickup_flexibility: pickupFlexibility || null,
      delivery_flexibility: deliveryFlexibility || null,
      route_preferences: routePreferences || null,

      route_polyline: routePolyline,
      route_distance_meters: routeDistanceMeters,
      route_duration_seconds: routeDurationSeconds,
      route_source: routeSource,

      main_cargo_category: mainCargoCategory,
      cargo_description: cargoDescription,
      permitted_cargo_categories: permittedCategories,
      handling_requirements: handlingRequirements || null,
      cargo_dimensions: cargoDimensions || null,

      pricing_mode: pricingMode,
      asking_price: Number(askingPrice),
      pickup_contribution: Number(pickupContribution) || 0,
      commercial_terms: commercialTerms || null,
    });
  }

  function handleOpenPreview(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = validateFormInput();
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ||
        "Please fix the highlighted validation issues.";
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setShowPreview(true);
  }

  async function handlePublishPool() {
    setFormError(null);
    const parsed = validateFormInput();
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Invalid pool details.");
      setShowPreview(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = parsed.data;
      const poolCode = `AGH-${new Date().getFullYear().toString().slice(-2)}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      // 1. Insert vehicle record (registration number protected by RLS)
      const { data: vehicleRow, error: vehicleErr } = await supabase
        .from("vehicles")
        .insert({
          owner_id: userId,
          category: payload.vehicle_category,
          registration_number: payload.registration_number.toUpperCase(),
          make_model: payload.make_model,
          notes: payload.vehicle_notes,
          total_capacity_kg: payload.total_capacity_kg,
          ownership_confirmed: true,
        })
        .select("id")
        .single();

      if (vehicleErr || !vehicleRow) {
        setFormError(vehicleErr?.message || "Failed to register vehicle.");
        return;
      }

      // 2. Insert pool listing with status OPEN (fallback to 'manual' route_source if 0005 constraint not yet applied)
      const basePoolPayload = {
        pool_code: poolCode,
        owner_id: userId,
        vehicle_id: vehicleRow.id,
        vehicle_category: payload.vehicle_category,
        ownership_confirmed: true,
        total_capacity_kg: payload.total_capacity_kg,
        existing_occupied_kg: payload.existing_occupied_kg,
        reserved_capacity_kg: 0,
        origin_name: payload.origin_name,
        origin_city: payload.origin_city,
        origin_state: payload.origin_state,
        origin_place_id: payload.origin_place_id,
        origin_lat: payload.origin_lat,
        origin_lng: payload.origin_lng,
        destination_name: payload.destination_name,
        destination_city: payload.destination_city,
        destination_state: payload.destination_state,
        destination_place_id: payload.destination_place_id,
        destination_lat: payload.destination_lat,
        destination_lng: payload.destination_lng,
        departure_date: payload.departure_date,
        departure_time: payload.departure_time,
        estimated_arrival: payload.estimated_arrival,
        pickup_flexibility: payload.pickup_flexibility,
        delivery_flexibility: payload.delivery_flexibility,
        route_preferences: payload.route_preferences,
        route_polyline: payload.route_polyline,
        route_distance_meters: payload.route_distance_meters,
        route_duration_seconds: payload.route_duration_seconds,
        route_source: payload.route_source,
        main_cargo_category: payload.main_cargo_category,
        cargo_description: payload.cargo_description,
        permitted_cargo_categories: payload.permitted_cargo_categories,
        handling_requirements: payload.handling_requirements,
        cargo_dimensions: payload.cargo_dimensions,
        pricing_mode: payload.pricing_mode,
        asking_price: payload.asking_price,
        pickup_contribution: payload.pickup_contribution,
        commercial_terms: payload.commercial_terms,
        status: "OPEN",
      };

      let { data: poolRow, error: poolErr } = await supabase
        .from("pools")
        .insert(basePoolPayload)
        .select("id, pool_code")
        .single();

      if (
        poolErr &&
        payload.route_source === "osrm" &&
        poolErr.message.includes("pools_route_source_check")
      ) {
        const retry = await supabase
          .from("pools")
          .insert({ ...basePoolPayload, route_source: "manual" })
          .select("id, pool_code")
          .single();
        poolRow = retry.data;
        poolErr = retry.error;
      }

      if (poolErr || !poolRow) {
        setFormError(poolErr?.message || "Failed to publish pool.");
        return;
      }

      // 3. Insert intermediate stops
      if (payload.stops.length > 0) {
        const { error: stopsErr } = await supabase.from("pool_stops").insert(
          payload.stops.map((stop, index) => ({
            pool_id: poolRow.id,
            stop_order: index + 1,
            location_name: stop.location_name,
            city: stop.city || stop.location_name,
            state: stop.state || null,
            place_id: stop.place_id || null,
            lat: stop.lat ?? null,
            lng: stop.lng ?? null,
            estimated_time: stop.estimated_time || null,
          })),
        );

        if (stopsErr) {
          toast.warning("Pool created, but one or more stops failed to save.");
        }
      }

      toast.success(`Pool ${poolRow.pool_code} published!`);
      router.push(`/pools/${poolRow.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleOpenPreview} className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[#B83B3B]/35 bg-[#B83B3B]/10 p-4 text-xs font-medium text-[#B83B3B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Section A: Vehicle Information */}
      <section className="agri-card space-y-5 p-6">
        <div className="border-b border-[#E4E8E2] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B48]">
            Section A
          </span>
          <h2 className="text-lg font-bold text-[#173D32]">
            Vehicle & Capacity Information
          </h2>
          <p className="text-xs text-[#718078]">
            Select your cargo vehicle category. Declared capacity is verified
            against realistic category limits.
          </p>
        </div>

        <VehicleCategorySelector
          value={vehicleCategory}
          onChange={handleCategorySelect}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="reg-num"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Vehicle Registration Number * (Restricted)
            </label>
            <input
              id="reg-num"
              type="text"
              required
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="MH 15 TR 4821"
              className="agri-input uppercase"
            />
            <p className="mt-1 text-[11px] text-[#718078]">
              Hidden from public search; shared only on confirmed deals.
            </p>
          </div>

          <div>
            <label
              htmlFor="make-model"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Vehicle Make / Model (Optional)
            </label>
            <input
              id="make-model"
              type="text"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              placeholder="e.g. Bolero Pik-Up / Tata Ace"
              className="agri-input"
            />
          </div>

          <div>
            <label
              htmlFor="veh-notes"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Body / Cover Notes (Optional)
            </label>
            <input
              id="veh-notes"
              type="text"
              value={vehicleNotes}
              onChange={(e) => setVehicleNotes(e.target.value)}
              placeholder="e.g. Waterproof tarpaulin available"
              className="agri-input"
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] p-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="total-cap"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Total Carrying Capacity (kg) *
            </label>
            <input
              id="total-cap"
              type="number"
              required
              min={vehicleSpec.minCapacityKg}
              max={vehicleSpec.maxCapacityKg}
              value={totalCapacityKg}
              onChange={(e) => setTotalCapacityKg(e.target.value)}
              className="agri-input"
            />
            <p className="mt-1 text-[11px] text-[#718078]">
              {vehicleSpec.label} range: {vehicleSpec.typicalRangeLabel}
            </p>
          </div>

          <div>
            <label
              htmlFor="occupied-cap"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Existing Occupied Cargo (kg) *
            </label>
            <input
              id="occupied-cap"
              type="number"
              required
              min={0}
              value={existingOccupiedKg}
              onChange={(e) => setExistingOccupiedKg(e.target.value)}
              className="agri-input"
            />
            <p className="mt-1 text-[11px] text-[#718078]">
              Weight already booked or carrying.
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[#242B31]">
              Available Pool Capacity
            </span>
            <div className="flex h-[38px] items-center rounded-lg border border-[#E4E8E2] bg-white px-3 text-sm font-bold text-[#173D32]">
              {availableCapacity > 0
                ? formatWeight(availableCapacity)
                : "Invalid (Must be > 0 kg)"}
            </div>
            <p className="mt-1 text-[11px] text-[#718078]">
              Total − Existing Occupied
            </p>
          </div>
        </div>

        {!capacityCheck.valid && capacityCheck.error && (
          <p className="text-xs font-medium text-[#B83B3B]">
            {capacityCheck.error}
          </p>
        )}

        <label className="flex items-start gap-2.5 rounded-lg border border-[#E4E8E2] bg-white p-3.5 text-xs text-[#242B31]">
          <input
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#173D32]"
            required
          />
          <span>
            <strong>Vehicle Authorisation Confirmation:</strong> I confirm that I
            own or am formally authorised by the owner/operator to list this
            vehicle&apos;s capacity on AGRIHUB. (AGRIHUB does not claim government
            verification of vehicle documents.)
          </span>
        </label>
      </section>

      {/* Section B: Route Information */}
      <section className="agri-card space-y-5 p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-[#E4E8E2] pb-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B48]">
              Section B
            </span>
            <h2 className="text-lg font-bold text-[#173D32]">
              Route & Schedule Information
            </h2>
          </div>
          <button
            type="button"
            onClick={() => computeRoadRoute(false)}
            disabled={computingRoute}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#173D32] bg-white px-3.5 py-2 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1] disabled:opacity-60"
          >
            {computingRoute ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5" />
            )}
            {computingRoute ? "Calculating Road Route..." : "Calculate Road Route"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LocationAutocomplete
            id="pool-origin"
            label="Origin Location *"
            value={origin.name}
            selectedLat={origin.lat}
            selectedLng={origin.lng}
            placeholder="Search town/mandi or click Map to pin"
            required
            onChange={(loc) => {
              setOrigin(loc);
              if (loc.lat == null || loc.lng == null) {
                setRoutePolyline(null);
                setRouteCoordinates(null);
                setRouteDistanceMeters(null);
                setRouteDurationSeconds(null);
                setRouteSource("manual");
              }
            }}
          />
          <LocationAutocomplete
            id="pool-destination"
            label="Destination Location *"
            value={destination.name}
            selectedLat={destination.lat}
            selectedLng={destination.lng}
            placeholder="Search destination or click Map to pin"
            required
            onChange={(loc) => {
              setDestination(loc);
              if (loc.lat == null || loc.lng == null) {
                setRoutePolyline(null);
                setRouteCoordinates(null);
                setRouteDistanceMeters(null);
                setRouteDurationSeconds(null);
                setRouteSource("manual");
              }
            }}
          />
        </div>

        <StopSelector
          stops={stops}
          onChange={(nextStops) => {
            setStops(nextStops);
            setRoutePolyline(null);
            setRouteCoordinates(null);
            setRouteDistanceMeters(null);
            setRouteDurationSeconds(null);
          }}
        />

        {routeStatusMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-[#D5A45B]/50 bg-[#D5A45B]/15 px-3.5 py-2.5 text-xs text-[#7A5416]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{routeStatusMessage}</span>
          </div>
        )}

        <RouteSummary
          distanceMeters={routeDistanceMeters}
          durationSeconds={routeDurationSeconds}
          routeSource={routeSource}
          hasRoadPolyline={Boolean(routePolyline)}
          stopCount={stops.filter((s) => s.location_name.trim()).length}
        />

        <RouteMap
          waypoints={mapWaypoints}
          encodedPolyline={routePolyline}
          routeCoordinates={routeCoordinates}
          heightClassName="h-72 sm:h-80"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="dep-date"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Departure Date *
            </label>
            <input
              id="dep-date"
              type="date"
              required
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="agri-input"
            />
          </div>
          <div>
            <label
              htmlFor="dep-time"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Departure Time *
            </label>
            <input
              id="dep-time"
              type="time"
              required
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="agri-input"
            />
          </div>
          <div>
            <label
              htmlFor="est-arrival"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Estimated Arrival (Optional)
            </label>
            <input
              id="est-arrival"
              type="datetime-local"
              value={estimatedArrival}
              onChange={(e) => setEstimatedArrival(e.target.value)}
              className="agri-input"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="pickup-flex"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Pickup Flexibility
            </label>
            <input
              id="pickup-flex"
              type="text"
              value={pickupFlexibility}
              onChange={(e) => setPickupFlexibility(e.target.value)}
              className="agri-input"
            />
          </div>
          <div>
            <label
              htmlFor="delivery-flex"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Delivery Flexibility
            </label>
            <input
              id="delivery-flex"
              type="text"
              value={deliveryFlexibility}
              onChange={(e) => setDeliveryFlexibility(e.target.value)}
              className="agri-input"
            />
          </div>
          <div>
            <label
              htmlFor="route-pref"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Route Preferences (Optional)
            </label>
            <input
              id="route-pref"
              type="text"
              value={routePreferences}
              onChange={(e) => setRoutePreferences(e.target.value)}
              placeholder="e.g. NH60 bypass, morning loading only"
              className="agri-input"
            />
          </div>
        </div>
      </section>

      {/* Section C: Cargo Information */}
      <section className="agri-card space-y-5 p-6">
        <div className="border-b border-[#E4E8E2] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B48]">
            Section C
          </span>
          <h2 className="text-lg font-bold text-[#173D32]">
            Cargo Compatibility & Description
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="main-cargo"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Primary Cargo Currently Carried *
            </label>
            <select
              id="main-cargo"
              value={mainCargoCategory}
              onChange={(e) =>
                setMainCargoCategory(e.target.value as CargoCategory)
              }
              className="agri-input"
            >
              {CARGO_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="cargo-dim"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Available Space Dimensions (Optional)
            </label>
            <input
              id="cargo-dim"
              type="text"
              value={cargoDimensions}
              onChange={(e) => setCargoDimensions(e.target.value)}
              placeholder="e.g. 6 ft x 4 ft rear bed space"
              className="agri-input"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="cargo-desc"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Cargo Description & Loading Notes *
          </label>
          <textarea
            id="cargo-desc"
            rows={4}
            required
            value={cargoDescription}
            onChange={(e) => setCargoDescription(e.target.value)}
            placeholder="Describe what you are currently carrying and what kind of pooled shipments fit cleanly alongside it (e.g. carrying 500 kg onion sacks; clean dry deck space available for bagged grains or packaged produce)."
            className="agri-input"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-semibold text-[#242B31]">
            Permitted Cargo Categories for Joining Shippers *
          </span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CARGO_CATEGORIES.map((cat) => {
              const active = permittedCategories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1]/60 px-3 py-2 text-xs text-[#242B31]"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => togglePermittedCargo(cat.id)}
                    className="h-3.5 w-3.5 accent-[#173D32]"
                  />
                  <span>{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="handling-req"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Handling Requirements (Optional)
          </label>
          <input
            id="handling-req"
            type="text"
            value={handlingRequirements}
            onChange={(e) => setHandlingRequirements(e.target.value)}
            placeholder="e.g. No leaking liquids, goods must be packed in sacks or crates"
            className="agri-input"
          />
        </div>
      </section>

      {/* Section D: Commercial Details */}
      <section className="agri-card space-y-5 p-6">
        <div className="border-b border-[#E4E8E2] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B48]">
            Section D
          </span>
          <h2 className="text-lg font-bold text-[#173D32]">
            Commercial Details & Pricing Clarity
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {PRICING_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPricingMode(mode.id)}
              className={`rounded-xl border p-3.5 text-left transition ${
                pricingMode === mode.id
                  ? "border-[#173D32] bg-[#173D32]/5 ring-1 ring-[#173D32]"
                  : "border-[#E4E8E2] bg-white hover:bg-[#F4F5F1]"
              }`}
            >
              <p className="text-xs font-bold text-[#242B31]">{mode.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-[#718078]">
                {mode.helper}
              </p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="asking-price"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Asking Amount (₹) —{" "}
              {pricingMode === "per_kg"
                ? "Per Kilogram Rate"
                : pricingMode === "fixed_contribution"
                  ? "Total Trip Contribution"
                  : "Indicative Starting Amount"}{" "}
              *
            </label>
            <input
              id="asking-price"
              type="number"
              min={0}
              step="1"
              required
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="agri-input"
            />
          </div>

          <div>
            <label
              htmlFor="pickup-contrib"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Optional Off-Route Pickup Fee (₹)
            </label>
            <input
              id="pickup-contrib"
              type="number"
              min={0}
              step="1"
              value={pickupContribution}
              onChange={(e) => setPickupContribution(e.target.value)}
              className="agri-input"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="comm-terms"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Additional Commercial Terms (Optional)
          </label>
          <textarea
            id="comm-terms"
            rows={2}
            value={commercialTerms}
            onChange={(e) => setCommercialTerms(e.target.value)}
            placeholder="e.g. Loading/unloading labor arranged by shipper; settle directly upon delivery."
            className="agri-input"
          />
        </div>
      </section>

      {/* Section E: Authenticated Contact Summary */}
      <section className="agri-card p-6">
        <div className="border-b border-[#E4E8E2] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F6B48]">
            Section E
          </span>
          <h2 className="text-lg font-bold text-[#173D32]">
            Operator Contact & Privacy
          </h2>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1 text-xs text-[#242B31]">
            <p>
              <strong>Publishing as:</strong>{" "}
              {profile?.full_name || "Authenticated Member"}
              {profile?.business_name ? ` (${profile.business_name})` : ""}
            </p>
            <p className="text-[#718078]">
              Based in{" "}
              {profile?.city && profile?.state
                ? `${profile.city}, ${profile.state}`
                : "your registered profile location"}
              . Your mobile number and vehicle registration remain hidden until a
              deal is mutually confirmed.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#173D32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#244638]"
          >
            <Eye className="h-4 w-4" />
            Preview Before Publishing
          </button>
        </div>
      </section>

      {/* Preview Modal / Confirmation Panel */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="agri-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
            <div className="flex items-start justify-between border-b border-[#E4E8E2] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#173D32]">
                  Review Pool Listing Before Publishing
                </h3>
                <p className="text-xs text-[#718078]">
                  Verify route, available capacity, and pricing clarity.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#1F6B48]" />
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#242B31]">
              <div className="rounded-lg bg-[#F4F5F1] p-3">
                <p className="font-bold text-[#173D32]">
                  {vehicleSpec.label} •{" "}
                  {registrationNumber.trim().toUpperCase()}
                </p>
                <p className="mt-1">
                  Available Space: <strong>{formatWeight(availableCapacity)}</strong>{" "}
                  (Total {formatWeight(parsedTotal)} − Existing{" "}
                  {formatWeight(parsedOccupied)})
                </p>
              </div>

              <div className="rounded-lg bg-[#F4F5F1] p-3">
                <p className="font-bold text-[#173D32]">Route & Departure</p>
                <p className="mt-1">
                  {origin.name} → {destination.name}
                </p>
                {stops.filter((s) => s.location_name.trim()).length > 0 && (
                  <p className="mt-1 text-[#718078]">
                    Stops:{" "}
                    {stops
                      .filter((s) => s.location_name.trim())
                      .map((s) => s.location_name)
                      .join(", ")}
                  </p>
                )}
                <p className="mt-1">
                  Departure: {departureDate} at {departureTime}
                </p>
              </div>

              <div className="rounded-lg bg-[#F4F5F1] p-3">
                <p className="font-bold text-[#173D32]">Pricing</p>
                <p className="mt-1">
                  {formatCurrency(Number(askingPrice))} (
                  {
                    PRICING_MODES.find((m) => m.id === pricingMode)
                      ?.unitSuffix
                  }
                  )
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                disabled={submitting}
                className="rounded-lg border border-[#E4E8E2] bg-white px-4 py-2 text-xs font-semibold text-[#242B31]"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handlePublishPool}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-5 py-2 text-xs font-semibold text-white hover:bg-[#244638] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submitting ? "Publishing Pool..." : "Confirm & Publish Pool"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

