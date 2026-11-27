import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Package,
  Shield,
  User,
  Weight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RouteMap, type RouteMapWaypoint } from "@/components/maps/RouteMap";
import { RouteSummary } from "@/components/maps/RouteSummary";
import { PoolDetailActions } from "@/components/pools/PoolDetailActions";
import { VEHICLE_CATEGORY_MAP } from "@/lib/constants/vehicles";
import { CARGO_CATEGORY_MAP, PRICING_MODE_MAP } from "@/lib/constants/cargo";
import { computeCapacitySnapshot } from "@/lib/capacity/calculator";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatShortDate,
  formatTimeShort,
  formatWeight,
} from "@/lib/utils";
import type { PoolListing, PoolRequest } from "@/types/domain";

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserContext();

  if (!ctx.isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: poolData } = await supabase
    .from("pools")
    .select(
      "*, owner:profiles!pools_owner_id_fkey(id, full_name, business_name, city, state, account_type, verification_status, created_at), stops:pool_stops(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!poolData) {
    notFound();
  }

  const pool = poolData as PoolListing;
  const sortedStops = [...(pool.stops || [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  );

  let existingMyRequest: PoolRequest | null = null;
  let incomingRequests: PoolRequest[] = [];
  let visibleVehicleReg: string | null = null;

  if (ctx.user) {
    // Vehicle registration plate is only accessible via RLS if user is owner or has confirmed deal
    const { data: vehicleRow } = await supabase
      .from("vehicles")
      .select("registration_number")
      .eq("id", pool.vehicle_id)
      .maybeSingle();

    visibleVehicleReg = vehicleRow?.registration_number ?? null;

    if (ctx.user.id === pool.owner_id) {
      const { data: reqRows } = await supabase
        .from("pool_requests")
        .select(
          "*, requester:profiles!pool_requests_requester_id_fkey(id, full_name, business_name, city, state)",
        )
        .eq("pool_id", pool.id)
        .order("created_at", { ascending: false });
      incomingRequests = (reqRows as PoolRequest[]) || [];
    } else {
      const { data: myReqRow } = await supabase
        .from("pool_requests")
        .select("*")
        .eq("pool_id", pool.id)
        .eq("requester_id", ctx.user.id)
        .neq("status", "CANCELLED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingMyRequest = (myReqRow as PoolRequest | null) ?? null;
    }
  }

  const vehicleSpec = VEHICLE_CATEGORY_MAP[pool.vehicle_category];
  const pricingSpec = PRICING_MODE_MAP[pool.pricing_mode];
  const cap = computeCapacitySnapshot(
    pool.total_capacity_kg,
    pool.existing_occupied_kg,
    pool.reserved_capacity_kg,
  );

  const waypoints: RouteMapWaypoint[] = [
    {
      label: pool.origin_name,
      lat: pool.origin_lat,
      lng: pool.origin_lng,
      role: "origin",
    },
    ...sortedStops.map((s) => ({
      label: s.location_name,
      lat: s.lat,
      lng: s.lng,
      role: "stop" as const,
    })),
    {
      label: pool.destination_name,
      lat: pool.destination_lat,
      lng: pool.destination_lng,
      role: "destination",
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/truck-pool/find"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#718078] hover:text-[#173D32]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Find Pool
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#173D32] border border-[#E4E8E2]">
              {pool.pool_code}
            </span>
            <StatusBadge status={pool.status} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Main Column */}
          <div className="space-y-6 lg:col-span-8">
            {/* Route & Map Card */}
            <div className="agri-card space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#173D32] text-white">
                    <VehicleIcon
                      category={pool.vehicle_category}
                      className="h-6 w-6 text-[#D5A45B]"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#173D32] sm:text-2xl">
                      {pool.origin_name} → {pool.destination_name}
                    </h1>
                    <p className="text-xs text-[#718078]">
                      {vehicleSpec?.label} •{" "}
                      {formatShortDate(pool.departure_date)} at{" "}
                      {formatTimeShort(pool.departure_time)}
                    </p>
                  </div>
                </div>
              </div>

              <RouteSummary
                distanceMeters={pool.route_distance_meters}
                durationSeconds={pool.route_duration_seconds}
                routeSource={pool.route_source}
                stopCount={sortedStops.length}
              />

              <RouteMap
                waypoints={waypoints}
                encodedPolyline={pool.route_polyline}
                heightClassName="h-72 sm:h-80"
              />

              {sortedStops.length > 0 && (
                <div className="rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] p-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#173D32]">
                    Planned Intermediate Stops ({sortedStops.length})
                  </h2>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {sortedStops.map((stop) => (
                      <div
                        key={stop.id}
                        className="flex items-center justify-between rounded-lg border border-[#E4E8E2] bg-white px-3 py-2 text-xs"
                      >
                        <span className="inline-flex items-center gap-2 font-semibold text-[#242B31]">
                          <MapPin className="h-3.5 w-3.5 text-[#D5A45B]" />
                          {stop.stop_order}. {stop.location_name}
                        </span>
                        {stop.estimated_time && (
                          <span className="text-[11px] text-[#718078]">
                            {stop.estimated_time}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Capacity & Vehicle Specs */}
            <div className="agri-card space-y-4 p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                <Weight className="h-4 w-4 text-[#173D32]" />
                Vehicle & Remaining Capacity
              </h2>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3">
                  <p className="text-[11px] text-[#718078]">Total Capacity</p>
                  <p className="mt-1 text-sm font-bold text-[#242B31]">
                    {formatWeight(cap.totalCapacityKg)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3">
                  <p className="text-[11px] text-[#718078]">Base Cargo</p>
                  <p className="mt-1 text-sm font-bold text-[#242B31]">
                    {formatWeight(cap.existingOccupiedKg)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3">
                  <p className="text-[11px] text-[#718078]">Reserved Deals</p>
                  <p className="mt-1 text-sm font-bold text-[#8A611E]">
                    {formatWeight(cap.reservedCapacityKg)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#1F6B48]/30 bg-[#1F6B48]/10 p-3">
                  <p className="text-[11px] font-semibold text-[#1F6B48]">
                    Available Now
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#173D32]">
                    {formatWeight(cap.availableCapacityKg)}
                  </p>
                </div>
              </div>

              {visibleVehicleReg ? (
                <p className="text-xs text-[#242B31]">
                  <strong>Vehicle Registration (Protected):</strong>{" "}
                  <span className="font-mono font-semibold">
                    {visibleVehicleReg}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-[#718078]">
                  Vehicle registration plate is restricted and becomes visible
                  only after a confirmed deal.
                </p>
              )}
            </div>

            {/* Cargo & Schedule Details */}
            <div className="agri-card space-y-4 p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-[#242B31]">
                <Package className="h-4 w-4 text-[#173D32]" />
                Cargo Compatibility & Terms
              </h2>

              <div className="space-y-3 text-xs text-[#242B31]">
                <div>
                  <span className="font-semibold text-[#718078]">
                    Primary Cargo:
                  </span>{" "}
                  <span className="font-semibold">
                    {CARGO_CATEGORY_MAP[pool.main_cargo_category]}
                  </span>
                </div>
                <p className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3.5 leading-relaxed">
                  {pool.cargo_description}
                </p>

                <div>
                  <span className="mb-1.5 block font-semibold text-[#718078]">
                    Permitted Joining Cargo Categories:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pool.permitted_cargo_categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-[#E4E8E2] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#173D32]"
                      >
                        {CARGO_CATEGORY_MAP[cat] || cat}
                      </span>
                    ))}
                  </div>
                </div>

                {pool.handling_requirements && (
                  <p>
                    <strong>Handling Requirements:</strong>{" "}
                    {pool.handling_requirements}
                  </p>
                )}
                {pool.cargo_dimensions && (
                  <p>
                    <strong>Available Bed Dimensions:</strong>{" "}
                    {pool.cargo_dimensions}
                  </p>
                )}

                <div className="grid gap-3 border-t border-[#E4E8E2] pt-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 text-[#173D32]" />
                    <div>
                      <p className="font-semibold">Departure & Flexibility</p>
                      <p className="text-[#718078]">
                        {formatShortDate(pool.departure_date)} at{" "}
                        {formatTimeShort(pool.departure_time)}
                      </p>
                      {pool.pickup_flexibility && (
                        <p className="text-[#718078]">
                          Pickup: {pool.pickup_flexibility}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-3.5 w-3.5 text-[#173D32]" />
                    <div>
                      <p className="font-semibold">Delivery & Route Notes</p>
                      {pool.delivery_flexibility && (
                        <p className="text-[#718078]">
                          Delivery: {pool.delivery_flexibility}
                        </p>
                      )}
                      {pool.route_preferences && (
                        <p className="text-[#718078]">
                          Notes: {pool.route_preferences}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Price, Creator, and Request Action */}
          <div className="space-y-5 lg:col-span-4">
            {/* Commercial Price Breakdown */}
            <div className="agri-card space-y-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#718078]">
                Commercial Terms
              </p>
              <div>
                <p className="text-2xl font-extrabold text-[#173D32]">
                  {formatCurrency(pool.asking_price)}
                </p>
                <p className="text-xs font-semibold text-[#D5A45B]">
                  {pricingSpec?.label} ({pricingSpec?.unitSuffix})
                </p>
                <p className="mt-1 text-[11px] text-[#718078]">
                  {pricingSpec?.helper}
                </p>
              </div>

              {pool.pickup_contribution > 0 && (
                <p className="border-t border-[#E4E8E2] pt-2 text-xs text-[#242B31]">
                  Off-route pickup fee:{" "}
                  <strong>{formatCurrency(pool.pickup_contribution)}</strong>
                </p>
              )}

              {pool.commercial_terms && (
                <p className="border-t border-[#E4E8E2] pt-2 text-xs text-[#718078]">
                  {pool.commercial_terms}
                </p>
              )}
            </div>

            {/* Creator Profile Summary */}
            <div className="agri-card space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718078]">
                  Pool Publisher
                </span>
                <Shield className="h-4 w-4 text-[#173D32]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173D32]/10 text-[#173D32]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <Link
                    href={`/profile/${pool.owner_id}`}
                    className="text-sm font-bold text-[#173D32] hover:underline"
                  >
                    {pool.owner?.full_name || "Transporter"}
                  </Link>
                  {pool.owner?.business_name && (
                    <p className="text-xs text-[#242B31]">
                      {pool.owner.business_name}
                    </p>
                  )}
                  <p className="text-[11px] text-[#718078]">
                    {pool.owner?.city && pool.owner?.state
                      ? `${pool.owner.city}, ${pool.owner.state}`
                      : "Regional Operator"}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[#718078]">
                Operator confirmed vehicle authorisation. Direct phone numbers
                unlock only after deal confirmation.
              </p>
            </div>

            {/* Request to Join / Owner Management */}
            <PoolDetailActions
              pool={pool}
              currentUserId={ctx.user?.id ?? null}
              existingMyRequest={existingMyRequest}
              incomingRequests={incomingRequests}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

