export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const DEFAULT_INDIA_CENTER: [number, number] = [22.9734, 78.6569];

export interface LatLngTuplePoint {
  lat: number;
  lng: number;
}

export function isValidCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Encodes an array of [lat, lng] points into standard polyline5 format
 * for compact storage in pools.route_polyline.
 */
export function encodePolyline(points: LatLngTuplePoint[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let output = "";

  const encodeValue = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    output += String.fromCharCode(v + 63);
  };

  for (const pt of points) {
    const lat = Math.round(pt.lat * 1e5);
    const lng = Math.round(pt.lng * 1e5);
    encodeValue(lat - prevLat);
    encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }

  return output;
}

/**
 * Decodes either a polyline5 string or a serialized GeoJSON LineString/coordinate array
 * into [lat, lng] pairs ready for Leaflet Polylines.
 */
export function decodeRouteGeometry(
  encodedOrJson: string | null | undefined,
): [number, number][] {
  if (!encodedOrJson) return [];
  const trimmed = encodedOrJson.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as
        | { coordinates?: [number, number][] }
        | [number, number][];
      const coords = Array.isArray(parsed) ? parsed : parsed.coordinates;
      if (Array.isArray(coords)) {
        return coords
          .filter(
            (pair) =>
              Array.isArray(pair) &&
              pair.length >= 2 &&
              isValidCoordinatePair(pair[1], pair[0]),
          )
          .map((pair) => [pair[1], pair[0]]);
      }
    } catch {
      return [];
    }
  }

  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < trimmed.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = trimmed.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < trimmed.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = trimmed.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < trimmed.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    const decodedLat = lat / 1e5;
    const decodedLng = lng / 1e5;
    if (isValidCoordinatePair(decodedLat, decodedLng)) {
      points.push([decodedLat, decodedLng]);
    }
  }

  return points;
}

