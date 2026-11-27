import { describe, expect, it } from "vitest";
import {
  canReserveCapacity,
  computeCapacitySnapshot,
} from "@/lib/capacity/calculator";
import { validateCapacityAgainstVehicleCategory } from "@/lib/constants/vehicles";

describe("Capacity Calculator & Vehicle Category Validation", () => {
  it("computes remaining available capacity accurately", () => {
    const snap = computeCapacitySnapshot(2000, 750, 450);
    expect(snap.availableCapacityKg).toBe(800);
    expect(snap.utilizationPercent).toBe(60);
  });

  it("never produces negative available capacity even if inputs are inconsistent", () => {
    const snap = computeCapacitySnapshot(1000, 900, 300);
    expect(snap.availableCapacityKg).toBe(0);
    expect(snap.utilizationPercent).toBe(100);
  });

  it("blocks reservations when pool is not OPEN or requested weight exceeds remaining", () => {
    expect(canReserveCapacity("FULL", 0, 100).allowed).toBe(false);
    expect(canReserveCapacity("OPEN", 300, 350).allowed).toBe(false);
    expect(canReserveCapacity("OPEN", 300, 0).allowed).toBe(false);
    expect(canReserveCapacity("OPEN", 300, 250).allowed).toBe(true);
  });

  it("enforces realistic vehicle category capacity bounds", () => {
    // Cargo Auto cannot claim 12,000 kg capacity
    expect(
      validateCapacityAgainstVehicleCategory("cargo_auto", 12000).valid,
    ).toBe(false);
    // Heavy Truck cannot claim 100 kg total capacity
    expect(
      validateCapacityAgainstVehicleCategory("heavy_truck", 100).valid,
    ).toBe(false);
    // Valid Pickup Truck capacity
    expect(
      validateCapacityAgainstVehicleCategory("pickup_truck", 1200).valid,
    ).toBe(true);
  });
});

