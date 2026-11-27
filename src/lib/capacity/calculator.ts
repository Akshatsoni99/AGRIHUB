export interface CapacitySnapshot {
  totalCapacityKg: number;
  existingOccupiedKg: number;
  reservedCapacityKg: number;
  availableCapacityKg: number;
  utilizationPercent: number;
}

export function computeCapacitySnapshot(
  totalCapacityKg: number,
  existingOccupiedKg: number,
  reservedCapacityKg: number,
): CapacitySnapshot {
  const safeTotal = Math.max(0, Math.floor(totalCapacityKg));
  const safeOccupied = Math.max(0, Math.floor(existingOccupiedKg));
  const safeReserved = Math.max(0, Math.floor(reservedCapacityKg));
  const used = safeOccupied + safeReserved;
  const available = Math.max(0, safeTotal - used);
  const utilizationPercent =
    safeTotal > 0 ? Math.min(100, Math.round((used / safeTotal) * 100)) : 0;

  return {
    totalCapacityKg: safeTotal,
    existingOccupiedKg: safeOccupied,
    reservedCapacityKg: safeReserved,
    availableCapacityKg: available,
    utilizationPercent,
  };
}

export function canReserveCapacity(
  poolStatus: string,
  availableCapacityKg: number,
  requestedCapacityKg: number,
): { allowed: boolean; reason?: string } {
  if (poolStatus !== "OPEN") {
    return {
      allowed: false,
      reason: `Pool is currently ${poolStatus} and cannot accept new reservations.`,
    };
  }
  if (!Number.isInteger(requestedCapacityKg) || requestedCapacityKg <= 0) {
    return {
      allowed: false,
      reason: "Requested capacity must be a positive whole number in kilograms.",
    };
  }
  if (requestedCapacityKg > availableCapacityKg) {
    return {
      allowed: false,
      reason: `Requested ${requestedCapacityKg.toLocaleString()} kg exceeds remaining available capacity (${availableCapacityKg.toLocaleString()} kg).`,
    };
  }
  return { allowed: true };
}

