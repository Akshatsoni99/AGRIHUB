import { NextResponse } from "next/server";

export interface GeocodeResultItem {
  name: string;
  displayName: string;
  city: string | null;
  state: string | null;
  placeId: string | null;
  lat: number;
  lng: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const searchCache = new Map<string, CacheEntry<GeocodeResultItem[]>>();
const reverseCache = new Map<string, CacheEntry<GeocodeResultItem | null>>();

let lastNominatimRequestMs = 0;

async function waitForNominatimRateWindow() {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestMs;
  if (elapsed < 1050) {
    await new Promise((resolve) => setTimeout(resolve, 1050 - elapsed));
  }
  lastNominatimRequestMs = Date.now();
}

interface NominatimAddress {
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
}

interface NominatimItem {
  place_id?: number;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
}

function normalizeNominatimItem(item: NominatimItem): GeocodeResultItem | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const addr = item.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state_district ||
    item.name ||
    null;
  const state = addr.state || null;

  const shortParts = [item.name || city, state].filter(Boolean);
  const displayName = item.display_name || shortParts.join(", ");
  const name =
    shortParts.length > 0
      ? Array.from(new Set(shortParts)).join(", ")
      : displayName;

  return {
    name,
    displayName,
    city,
    state,
    placeId: item.place_id ? `osm:${item.place_id}` : null,
    lat,
    lng,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  try {
    // Reverse geocoding when lat/lng provided (from interactive map click)
    if (latParam !== null && lngParam !== null) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return NextResponse.json(
          { error: "Invalid coordinates for reverse lookup." },
          { status: 400 },
        );
      }

      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const cached = reverseCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ location: cached.data, cached: true });
      }

      await waitForNominatimRateWindow();

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(
          String(lat),
        )}&lon=${encodeURIComponent(String(lng))}`,
        {
          headers: {
            "User-Agent": "AGRIHUB-Logistics-Platform/1.0",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(7000),
          cache: "no-store",
        },
      );

      if (!res.ok) {
        return NextResponse.json({
          location: null,
          unavailable: true,
          message: `Nominatim reverse lookup returned ${res.status}`,
        });
      }

      const data = (await res.json()) as NominatimItem;
      const normalized = normalizeNominatimItem(data);
      reverseCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: normalized,
      });

      return NextResponse.json({ location: normalized });
    }

    // Forward search requires sensible minimum length
    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const cacheKey = q.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ results: cached.data, cached: true });
    }

    await waitForNominatimRateWindow();

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(
        q,
      )}`,
      {
        headers: {
          "User-Agent": "AGRIHUB-Logistics-Platform/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json({
        results: [],
        unavailable: true,
        message: "Location search temporarily unavailable. Use the map picker.",
      });
    }

    const raw = (await res.json()) as NominatimItem[];
    const results = (Array.isArray(raw) ? raw : [])
      .map(normalizeNominatimItem)
      .filter((item): item is GeocodeResultItem => item !== null);

    searchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: results,
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({
      results: [],
      location: null,
      unavailable: true,
      message: "Could not reach OpenStreetMap Nominatim. Pick location directly on the map.",
    });
  }
}

