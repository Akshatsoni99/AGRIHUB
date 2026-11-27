import type {
  CargoCategory,
  PoolListing,
  VehicleCategory,
} from "@/types/domain";

export interface MatchSearchCriteria {
  origin?: string;
  originLat?: number | null;
  originLng?: number | null;
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  vehicleCategory?: VehicleCategory | "all";
  requiredCapacityKg?: number;
  departureDate?: string;
  cargoCategory?: CargoCategory | "all";
  maxPrice?: number;
}

export type MatchMode = "geographic_route" | "manual_text_fallback";

export interface CriterionBreakdown {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: "strong" | "partial" | "mismatch" | "neutral";
  detail: string;
}

export interface PoolMatchResult {
  poolId: string;
  totalScore: number;
  matchTier: "Strong Match" | "Good Overlap" | "Partial Fit" | "Low Fit";
  matchMode: MatchMode;
  explanation: string;
  breakdown: CriterionBreakdown[];
  isCapacityCompatible: boolean;
  isCargoCompatible: boolean;
  isVehicleCompatible: boolean;
}

interface LatLng {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in kilometers between two geographic coordinates. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Decodes an encoded Google polyline into LatLng coordinates for geometric
 * point-to-route proximity checks.
 */
export function decodeEncodedPolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Finds minimum distance in km from a point to the nearest vertex/segment
 * along a route corridor and returns the fractional progress index [0..1].
 */
function findClosestPointOnCorridor(
  point: LatLng,
  corridorPoints: LatLng[],
): { distanceKm: number; progress: number } {
  if (corridorPoints.length === 0) {
    return { distanceKm: Infinity, progress: 0 };
  }
  if (corridorPoints.length === 1) {
    return { distanceKm: haversineDistanceKm(point, corridorPoints[0]), progress: 0 };
  }

  let bestDist = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < corridorPoints.length; i++) {
    const d = haversineDistanceKm(point, corridorPoints[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return {
    distanceKm: bestDist,
    progress: bestIndex / Math.max(1, corridorPoints.length - 1),
  };
}

function normalizePlace(text: string | null | undefined): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function placeTokenOverlap(query: string, candidate: string): boolean {
  const q = normalizePlace(query);
  const c = normalizePlace(candidate);
  if (!q || !c) return false;
  if (c.includes(q) || q.includes(c)) return true;

  const qTokens = q.split(" ").filter((t) => t.length >= 3);
  const cTokens = c.split(" ").filter((t) => t.length >= 3);
  if (qTokens.length === 0 || cTokens.length === 0) return false;

  const matches = qTokens.filter((qt) =>
    cTokens.some((ct) => ct === qt || (qt.length >= 4 && ct.startsWith(qt))),
  );
  return matches.length > 0 && matches.length === qTokens.length;
}

function buildRouteChain(pool: PoolListing): {
  label: string;
  city: string | null;
  coords: LatLng | null;
  isStop: boolean;
}[] {
  const chain: {
    label: string;
    city: string | null;
    coords: LatLng | null;
    isStop: boolean;
  }[] = [
    {
      label: pool.origin_name,
      city: pool.origin_city,
      coords:
        pool.origin_lat != null && pool.origin_lng != null
          ? { lat: pool.origin_lat, lng: pool.origin_lng }
          : null,
      isStop: false,
    },
  ];

  const sortedStops = [...(pool.stops || [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  );
  for (const stop of sortedStops) {
    chain.push({
      label: stop.location_name,
      city: stop.city,
      coords:
        stop.lat != null && stop.lng != null
          ? { lat: stop.lat, lng: stop.lng }
          : null,
      isStop: true,
    });
  }

  chain.push({
    label: pool.destination_name,
    city: pool.destination_city,
    coords:
      pool.destination_lat != null && pool.destination_lng != null
        ? { lat: pool.destination_lat, lng: pool.destination_lng }
        : null,
    isStop: false,
  });

  return chain;
}

/**
 * Evaluates a published pool against a shipper's search criteria using 9 transparent criteria.
 * Never claims geographic verification when operating in manual text fallback mode.
 */
export function evaluatePoolMatch(
  pool: PoolListing,
  criteria: MatchSearchCriteria,
): PoolMatchResult {
  const breakdown: CriterionBreakdown[] = [];
  const chain = buildRouteChain(pool);

  const hasQueryCoords =
    criteria.originLat != null &&
    criteria.originLng != null &&
    criteria.destinationLat != null &&
    criteria.destinationLng != null;

  const hasPoolCoords =
    pool.origin_lat != null &&
    pool.origin_lng != null &&
    pool.destination_lat != null &&
    pool.destination_lng != null;

  const useGeographicMode = hasQueryCoords && hasPoolCoords;
  const matchMode: MatchMode = useGeographicMode
    ? "geographic_route"
    : "manual_text_fallback";

  // 1. Vehicle compatibility (max 10)
  const isVehicleCompatible =
    !criteria.vehicleCategory ||
    criteria.vehicleCategory === "all" ||
    pool.vehicle_category === criteria.vehicleCategory;
  breakdown.push({
    key: "vehicle",
    label: "Vehicle compatibility",
    score: isVehicleCompatible ? 10 : 0,
    maxScore: 10,
    status: isVehicleCompatible ? "strong" : "mismatch",
    detail: isVehicleCompatible
      ? criteria.vehicleCategory && criteria.vehicleCategory !== "all"
        ? "Matches selected cargo vehicle category."
        : "No vehicle restriction applied."
      : "Different vehicle category than selected filter.",
  });

  // 2. Available capacity (max 15)
  const requiredKg = criteria.requiredCapacityKg || 0;
  let capacityScore = 12;
  let isCapacityCompatible = pool.available_capacity_kg > 0;
  let capacityDetail = `${pool.available_capacity_kg.toLocaleString()} kg space remaining.`;
  if (requiredKg > 0) {
    if (pool.available_capacity_kg >= requiredKg) {
      capacityScore = 15;
      isCapacityCompatible = true;
      capacityDetail = `Fits ${requiredKg.toLocaleString()} kg load (${pool.available_capacity_kg.toLocaleString()} kg available).`;
    } else {
      capacityScore = 0;
      isCapacityCompatible = false;
      capacityDetail = `Only ${pool.available_capacity_kg.toLocaleString()} kg available for ${requiredKg.toLocaleString()} kg needed.`;
    }
  }
  breakdown.push({
    key: "capacity",
    label: "Available cargo capacity",
    score: capacityScore,
    maxScore: 15,
    status: isCapacityCompatible ? "strong" : "mismatch",
    detail: capacityDetail,
  });

  // 3, 4, 5, 6. Pickup proximity, destination proximity, direction compatibility, and intermediate stop overlap (max 45 combined)
  let pickupScore = 8;
  let destScore = 8;
  let directionScore = 7;
  let stopOverlapScore = 4;
  let routeNarrative = `Route runs from ${pool.origin_name} to ${pool.destination_name}.`;

  if (useGeographicMode) {
    const polylinePoints = pool.route_polyline
      ? decodeEncodedPolyline(pool.route_polyline)
      : [];
    const corridorPoints =
      polylinePoints.length >= 2
        ? polylinePoints
        : chain
            .map((node) => node.coords)
            .filter((c): c is LatLng => c !== null);

    const reqOrigin: LatLng = {
      lat: criteria.originLat!,
      lng: criteria.originLng!,
    };
    const reqDest: LatLng = {
      lat: criteria.destinationLat!,
      lng: criteria.destinationLng!,
    };

    const pickupNearest = findClosestPointOnCorridor(reqOrigin, corridorPoints);
    const destNearest = findClosestPointOnCorridor(reqDest, corridorPoints);

    // Pickup proximity (max 15)
    if (pickupNearest.distanceKm <= 15) {
      pickupScore = 15;
    } else if (pickupNearest.distanceKm <= 40) {
      pickupScore = 11;
    } else if (pickupNearest.distanceKm <= 80) {
      pickupScore = 6;
    } else {
      pickupScore = 0;
    }

    // Destination proximity (max 15)
    if (destNearest.distanceKm <= 15) {
      destScore = 15;
    } else if (destNearest.distanceKm <= 40) {
      destScore = 11;
    } else if (destNearest.distanceKm <= 80) {
      destScore = 6;
    } else {
      destScore = 0;
    }

    // Direction compatibility (max 10)
    const forwardOrder = destNearest.progress > pickupNearest.progress;
    if (forwardOrder && pickupScore > 0 && destScore > 0) {
      directionScore = 10;
    } else if (forwardOrder) {
      directionScore = 5;
    } else {
      directionScore = 0;
    }

    // Stop compatibility (max 5)
    const stopHits = chain
      .filter((n) => n.isStop && n.coords)
      .filter(
        (n) =>
          haversineDistanceKm(reqOrigin, n.coords!) <= 25 ||
          haversineDistanceKm(reqDest, n.coords!) <= 25,
      );
    stopOverlapScore = stopHits.length > 0 ? 5 : pickupScore >= 11 && destScore >= 11 ? 4 : 0;

    breakdown.push({
      key: "pickup_proximity",
      label: "Pickup proximity to route",
      score: pickupScore,
      maxScore: 15,
      status: pickupScore >= 11 ? "strong" : pickupScore > 0 ? "partial" : "mismatch",
      detail: `Pickup is ~${Math.round(pickupNearest.distanceKm)} km from the published route corridor.`,
    });
    breakdown.push({
      key: "destination_proximity",
      label: "Destination proximity to route",
      score: destScore,
      maxScore: 15,
      status: destScore >= 11 ? "strong" : destScore > 0 ? "partial" : "mismatch",
      detail: `Drop point is ~${Math.round(destNearest.distanceKm)} km from the published route corridor.`,
    });
    breakdown.push({
      key: "direction",
      label: "Route direction compatibility",
      score: directionScore,
      maxScore: 10,
      status: directionScore >= 8 ? "strong" : directionScore > 0 ? "partial" : "mismatch",
      detail: forwardOrder
        ? "Pickup appears before drop along the vehicle's travel direction."
        : "Pickup and drop appear reversed relative to this vehicle's direction.",
    });
    breakdown.push({
      key: "stops",
      label: "Intermediate stop compatibility",
      score: stopOverlapScore,
      maxScore: 5,
      status: stopOverlapScore >= 4 ? "strong" : "neutral",
      detail:
        stopHits.length > 0
          ? `Planned intermediate stop near ${stopHits.map((s) => s.label).join(", ")}.`
          : "Evaluated against full route path.",
    });

    if (forwardOrder && pickupScore >= 11 && destScore >= 11) {
      const stopNote =
        stopHits.length > 0 ? ` via ${stopHits[0].label}` : "";
      routeNarrative = `Geographic route overlap: ${criteria.origin || "your pickup"} to ${criteria.destination || "your drop"} aligns with this vehicle's ${pool.origin_name}-to-${pool.destination_name} route${stopNote} (within ${Math.round(Math.max(pickupNearest.distanceKm, destNearest.distanceKm))} km of corridor).`;
    } else if (!forwardOrder) {
      routeNarrative = `Direction mismatch: this vehicle travels from ${pool.origin_name} toward ${pool.destination_name}, opposite to your requested pickup-to-drop sequence.`;
    } else {
      routeNarrative = `Partial geographic corridor match (${Math.round(pickupNearest.distanceKm)} km from pickup, ${Math.round(destNearest.distanceKm)} km from drop).`;
    }
  } else {
    // Clearly identified manual text/city fallback mode (no Google Maps coordinates available for query/pool)
    const queryOrigin = criteria.origin?.trim() || "";
    const queryDest = criteria.destination?.trim() || "";

    let originMatchIdx = -1;
    let destMatchIdx = -1;

    if (queryOrigin) {
      originMatchIdx = chain.findIndex(
        (node) =>
          placeTokenOverlap(queryOrigin, node.label) ||
          (node.city ? placeTokenOverlap(queryOrigin, node.city) : false),
      );
    }
    if (queryDest) {
      destMatchIdx = chain.findIndex(
        (node) =>
          placeTokenOverlap(queryDest, node.label) ||
          (node.city ? placeTokenOverlap(queryDest, node.city) : false),
      );
    }

    if (queryOrigin) {
      pickupScore = originMatchIdx === 0 ? 12 : originMatchIdx > 0 ? 10 : 0;
    }
    if (queryDest) {
      destScore =
        destMatchIdx === chain.length - 1 ? 12 : destMatchIdx > 0 ? 10 : 0;
    }

    if (queryOrigin && queryDest) {
      if (originMatchIdx >= 0 && destMatchIdx >= 0 && destMatchIdx > originMatchIdx) {
        directionScore = 10;
      } else if (originMatchIdx >= 0 && destMatchIdx >= 0 && destMatchIdx <= originMatchIdx) {
        directionScore = 0;
      } else {
        directionScore = 3;
      }
    }

    const matchedStopNames = chain
      .filter(
        (node) =>
          node.isStop &&
          ((queryOrigin &&
            (placeTokenOverlap(queryOrigin, node.label) ||
              (node.city ? placeTokenOverlap(queryOrigin, node.city) : false))) ||
            (queryDest &&
              (placeTokenOverlap(queryDest, node.label) ||
                (node.city ? placeTokenOverlap(queryDest, node.city) : false)))),
      )
      .map((n) => n.label);

    stopOverlapScore = matchedStopNames.length > 0 ? 5 : 1;

    breakdown.push({
      key: "pickup_proximity",
      label: "Pickup city/stop match (manual)",
      score: pickupScore,
      maxScore: 15,
      status: pickupScore >= 10 ? "strong" : queryOrigin ? "mismatch" : "neutral",
      detail: queryOrigin
        ? originMatchIdx >= 0
          ? `Text match at ${chain[originMatchIdx].label} (manual city check; not geographically verified).`
          : `No direct city/stop text match for "${queryOrigin}".`
        : "Enter a pickup city to score pickup alignment.",
    });
    breakdown.push({
      key: "destination_proximity",
      label: "Destination city/stop match (manual)",
      score: destScore,
      maxScore: 15,
      status: destScore >= 10 ? "strong" : queryDest ? "mismatch" : "neutral",
      detail: queryDest
        ? destMatchIdx >= 0
          ? `Text match at ${chain[destMatchIdx].label} (manual city check; not geographically verified).`
          : `No direct city/stop text match for "${queryDest}".`
        : "Enter a drop city to score destination alignment.",
    });
    breakdown.push({
      key: "direction",
      label: "Route direction order (manual)",
      score: directionScore,
      maxScore: 10,
      status: directionScore >= 8 ? "strong" : directionScore === 0 ? "mismatch" : "neutral",
      detail:
        originMatchIdx >= 0 && destMatchIdx >= 0
          ? destMatchIdx > originMatchIdx
            ? "Stop order aligns with vehicle direction."
            : "Stop order appears reversed relative to this vehicle's route."
          : "City order could not be fully verified without map coordinates.",
    });
    breakdown.push({
      key: "stops",
      label: "Intermediate stop compatibility",
      score: stopOverlapScore,
      maxScore: 5,
      status: matchedStopNames.length > 0 ? "strong" : "neutral",
      detail:
        matchedStopNames.length > 0
          ? `Matches listed intermediate stop: ${matchedStopNames.join(", ")}.`
          : chain.length > 2
            ? `${chain.length - 2} intermediate stop(s) listed on route.`
            : "Direct route with no intermediate stops listed.",
    });

    if (queryOrigin && queryDest && originMatchIdx >= 0 && destMatchIdx > originMatchIdx) {
      const viaStop = matchedStopNames.length > 0 ? ` through ${matchedStopNames.join(", ")}` : "";
      routeNarrative = `Text-based route overlap (manual fallback): your ${queryOrigin}-to-${queryDest} shipment matches this vehicle's ${pool.origin_name}-to-${pool.destination_name} listing${viaStop}.`;
    } else if (queryOrigin && queryDest && originMatchIdx >= 0 && destMatchIdx >= 0 && destMatchIdx <= originMatchIdx) {
      routeNarrative = `Direction mismatch (manual check): ${pool.origin_name}-to-${pool.destination_name} runs in the opposite order of ${queryOrigin} to ${queryDest}.`;
    } else if (queryOrigin || queryDest) {
      routeNarrative = `Partial city/stop match (manual fallback) on ${pool.origin_name}-to-${pool.destination_name}. Configure Google Maps coordinates for geographic corridor verification.`;
    }
  }

  // 7. Departure-date compatibility (max 10)
  let dateScore = 7;
  let dateDetail = `Departs on ${pool.departure_date}.`;
  if (criteria.departureDate) {
    const reqTime = new Date(criteria.departureDate).getTime();
    const poolTime = new Date(pool.departure_date).getTime();
    const diffDays = Math.round(Math.abs(poolTime - reqTime) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      dateScore = 10;
      dateDetail = "Exact departure date match.";
    } else if (diffDays === 1) {
      dateScore = 7;
      dateDetail = "Departs within 1 day of requested date.";
    } else if (diffDays <= 3) {
      dateScore = 4;
      dateDetail = `Departs ${diffDays} days from requested date.`;
    } else {
      dateScore = 0;
      dateDetail = `Departs ${diffDays} days away from requested date.`;
    }
  }
  breakdown.push({
    key: "departure_date",
    label: "Departure-date compatibility",
    score: dateScore,
    maxScore: 10,
    status: dateScore >= 8 ? "strong" : dateScore > 0 ? "partial" : "mismatch",
    detail: dateDetail,
  });

  // 8. Cargo compatibility (max 10)
  const isCargoCompatible =
    !criteria.cargoCategory ||
    criteria.cargoCategory === "all" ||
    pool.permitted_cargo_categories.includes(criteria.cargoCategory) ||
    pool.main_cargo_category === criteria.cargoCategory;

  breakdown.push({
    key: "cargo",
    label: "Cargo compatibility",
    score: isCargoCompatible ? 10 : 0,
    maxScore: 10,
    status: isCargoCompatible ? "strong" : "mismatch",
    detail: isCargoCompatible
      ? "Vehicle accepts your cargo category."
      : "Requested cargo category is not listed in permitted cargo.",
  });

  // 9. Price preference (max 10)
  let priceScore = 8;
  let priceDetail = `Asking ${pool.asking_price.toLocaleString("en-IN")} (${pool.pricing_mode.replace("_", " ")}).`;
  if (criteria.maxPrice != null && criteria.maxPrice > 0) {
    if (pool.asking_price <= criteria.maxPrice) {
      priceScore = 10;
      priceDetail = "Within your maximum budget preference.";
    } else if (pool.pricing_mode === "negotiable" && pool.asking_price <= criteria.maxPrice * 1.2) {
      priceScore = 6;
      priceDetail = "Slightly above budget, marked negotiable.";
    } else {
      priceScore = 0;
      priceDetail = "Exceeds your maximum price filter.";
    }
  }
  breakdown.push({
    key: "price",
    label: "Price preference",
    score: priceScore,
    maxScore: 10,
    status: priceScore >= 8 ? "strong" : priceScore > 0 ? "partial" : "mismatch",
    detail: priceDetail,
  });

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      breakdown.reduce((sum, item) => sum + item.score, 0),
    ),
  );

  let matchTier: PoolMatchResult["matchTier"] = "Low Fit";
  if (totalScore >= 80 && isCapacityCompatible && isCargoCompatible) {
    matchTier = "Strong Match";
  } else if (totalScore >= 60 && isCapacityCompatible) {
    matchTier = "Good Overlap";
  } else if (totalScore >= 40) {
    matchTier = "Partial Fit";
  }

  return {
    poolId: pool.id,
    totalScore,
    matchTier,
    matchMode,
    explanation: routeNarrative,
    breakdown,
    isCapacityCompatible,
    isCargoCompatible,
    isVehicleCompatible,
  };
}

