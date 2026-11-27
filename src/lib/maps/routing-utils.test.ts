import { describe, expect, it } from "vitest";
import {
  decodeRouteGeometry,
  encodePolyline,
  isValidCoordinatePair,
} from "@/lib/maps/routing-utils";

describe("Routing Utilities (OSRM GeoJSON & Polyline5)", () => {
  it("encodes and decodes polyline5 coordinates accurately", () => {
    const input = [
      { lat: 26.9124, lng: 75.7873 },
      { lat: 26.4499, lng: 74.6399 },
      { lat: 26.2389, lng: 73.0243 },
    ];
    const encoded = encodePolyline(input);
    const decoded = decodeRouteGeometry(encoded);

    expect(decoded).toHaveLength(3);
    expect(decoded[0][0]).toBeCloseTo(26.9124, 4);
    expect(decoded[0][1]).toBeCloseTo(75.7873, 4);
    expect(decoded[2][0]).toBeCloseTo(26.2389, 4);
    expect(decoded[2][1]).toBeCloseTo(73.0243, 4);
  });

  it("decodes GeoJSON LineString coordinate arrays in [lng, lat] order", () => {
    const geoJson = JSON.stringify({
      type: "LineString",
      coordinates: [
        [73.7898, 19.9975],
        [73.8567, 18.5204],
      ],
    });
    const decoded = decodeRouteGeometry(geoJson);
    expect(decoded).toEqual([
      [19.9975, 73.7898],
      [18.5204, 73.8567],
    ]);
  });

  it("validates latitude and longitude bounds strictly", () => {
    expect(isValidCoordinatePair(26.9124, 75.7873)).toBe(true);
    expect(isValidCoordinatePair(95, 75)).toBe(false);
    expect(isValidCoordinatePair(26, 200)).toBe(false);
    expect(isValidCoordinatePair(null, 75)).toBe(false);
    expect(isValidCoordinatePair(Number.NaN, 75)).toBe(false);
  });
});

