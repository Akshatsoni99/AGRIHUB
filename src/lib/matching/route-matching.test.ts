import { describe, expect, it } from "vitest";
import {
  evaluatePoolMatch,
  haversineDistanceKm,
} from "@/lib/matching/route-matching";
import type { PoolListing } from "@/types/domain";

function buildMockPool(overrides: Partial<PoolListing> = {}): PoolListing {
  return {
    id: "pool-1",
    pool_code: "AGH-26-TEST",
    owner_id: "owner-1",
    vehicle_id: "veh-1",
    vehicle_category: "pickup_truck",
    ownership_confirmed: true,
    total_capacity_kg: 1500,
    existing_occupied_kg: 500,
    reserved_capacity_kg: 0,
    available_capacity_kg: 1000,
    origin_name: "Jaipur",
    origin_city: "Jaipur",
    origin_state: "Rajasthan",
    origin_place_id: null,
    origin_lat: 26.9124,
    origin_lng: 75.7873,
    destination_name: "Jodhpur",
    destination_city: "Jodhpur",
    destination_state: "Rajasthan",
    destination_place_id: null,
    destination_lat: 26.2389,
    destination_lng: 73.0243,
    departure_date: "2026-12-01",
    departure_time: "08:00:00",
    estimated_arrival: null,
    pickup_flexibility: null,
    delivery_flexibility: null,
    route_preferences: null,
    route_polyline: null,
    route_distance_meters: null,
    route_duration_seconds: null,
    route_source: "manual",
    main_cargo_category: "grains",
    cargo_description: "500 kg wheat bags; dry deck available",
    permitted_cargo_categories: ["agriculture", "grains"],
    handling_requirements: null,
    cargo_dimensions: null,
    pricing_mode: "fixed_contribution",
    asking_price: 2000,
    pickup_contribution: 0,
    commercial_terms: null,
    status: "OPEN",
    is_flagged: false,
    moderation_note: null,
    created_at: "2026-11-27T00:00:00Z",
    updated_at: "2026-11-27T00:00:00Z",
    stops: [
      {
        id: "stop-1",
        pool_id: "pool-1",
        stop_order: 1,
        location_name: "Ajmer",
        city: "Ajmer",
        state: "Rajasthan",
        place_id: null,
        lat: 26.4499,
        lng: 74.6399,
        estimated_time: "11:00",
      },
    ],
    ...overrides,
  };
}

describe("Smart Route and Capacity Matching Engine", () => {
  it("recognizes overlapping intermediate stop in manual fallback mode and labels mode honestly", () => {
    const pool = buildMockPool();
    const res = evaluatePoolMatch(pool, {
      origin: "Jaipur",
      destination: "Ajmer",
      requiredCapacityKg: 400,
      departureDate: "2026-12-01",
      cargoCategory: "grains",
      maxPrice: 2500,
    });

    expect(res.matchMode).toBe("manual_text_fallback");
    expect(res.isCapacityCompatible).toBe(true);
    expect(res.isCargoCompatible).toBe(true);
    expect(res.totalScore).toBeGreaterThanOrEqual(80);
    expect(res.explanation.toLowerCase()).toContain("ajmer");
  });

  it("penalizes reverse-direction requests", () => {
    const pool = buildMockPool();
    const res = evaluatePoolMatch(pool, {
      origin: "Jodhpur",
      destination: "Jaipur",
      requiredCapacityKg: 400,
    });

    expect(res.explanation.toLowerCase()).toContain("direction mismatch");
    const directionItem = res.breakdown.find((b) => b.key === "direction");
    expect(directionItem?.score).toBe(0);
  });

  it("evaluates geographic coordinates when provided on both query and pool", () => {
    const pool = buildMockPool();
    const res = evaluatePoolMatch(pool, {
      origin: "Jaipur",
      originLat: 26.9124,
      originLng: 75.7873,
      destination: "Ajmer",
      destinationLat: 26.4499,
      destinationLng: 74.6399,
      requiredCapacityKg: 300,
      departureDate: "2026-12-01",
      cargoCategory: "grains",
    });

    expect(res.matchMode).toBe("geographic_route");
    expect(res.totalScore).toBeGreaterThanOrEqual(80);
  });

  it("marks capacity and cargo incompatibility explicitly", () => {
    const pool = buildMockPool({ available_capacity_kg: 200 });
    const res = evaluatePoolMatch(pool, {
      requiredCapacityKg: 600,
      cargoCategory: "construction_material",
    });

    expect(res.isCapacityCompatible).toBe(false);
    expect(res.isCargoCompatible).toBe(false);
    expect(res.matchTier).not.toBe("Strong Match");
  });

  it("computes accurate haversine distance between cities", () => {
    const km = haversineDistanceKm(
      { lat: 26.9124, lng: 75.7873 },
      { lat: 26.4499, lng: 74.6399 },
    );
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(150);
  });
});

