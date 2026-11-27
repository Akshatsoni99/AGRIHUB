import { NextResponse } from "next/server";
import { z } from "zod";
import {
  encodePolyline,
  isValidCoordinatePair,
} from "@/lib/maps/routing-utils";

const waypointSchema = z.object({
  address: z.string().trim().min(1).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const computeRouteInputSchema = z.object({
  origin: waypointSchema,
  destination: waypointSchema,
  intermediates: z.array(waypointSchema).max(8).default([]),
});

interface CachedRoutePayload {
  expiresAt: number;
  payload: {
    routeSource: "osrm";
    distanceMeters: number;
    durationSeconds: number;
    encodedPolyline: string;
    coordinates: [number, number][];
  };
}

const ROUTE_CACHE_TTL_MS = 30 * 60 * 1000;
const routeCache = new Map<string, CachedRoutePayload>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = computeRouteInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          routeFound: false,
          routeSource: "manual",
          error:
            "Select valid origin and destination coordinates (via search or map picker) to calculate a road route.",
        },
        { status: 400 },
      );
    }

    const waypoints = [
      parsed.data.origin,
      ...parsed.data.intermediates,
      parsed.data.destination,
    ];

    if (waypoints.some((wp) => !isValidCoordinatePair(wp.lat, wp.lng))) {
      return NextResponse.json(
        {
          routeFound: false,
          routeSource: "manual",
          error: "One or more coordinates are out of valid latitude/longitude bounds.",
        },
        { status: 400 },
      );
    }

    // OSRM requires exact longitude,latitude order
    const coordString = waypoints
      .map((wp) => `${wp.lng.toFixed(5)},${wp.lat.toFixed(5)}`)
      .join(";");

    const cached = routeCache.get(coordString);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        routeFound: true,
        cached: true,
        ...cached.payload,
      });
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(osrmUrl, {
      headers: {
        "User-Agent": "AGRIHUB-Logistics-Platform/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          routeFound: false,
          routeSource: "manual",
          unavailable: true,
          error: `Public OSRM routing service returned status ${res.status}. Please try again shortly.`,
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      code?: string;
      message?: string;
      routes?: {
        distance?: number;
        duration?: number;
        geometry?: {
          type?: string;
          coordinates?: [number, number][];
        };
      }[];
    };

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return NextResponse.json({
        routeFound: false,
        routeSource: "manual",
        error:
          data.message ||
          "No drivable road route was found between the selected points.",
      });
    }

    const route = data.routes[0];
    const geoJsonCoords = route.geometry?.coordinates;
    if (!Array.isArray(geoJsonCoords) || geoJsonCoords.length < 2) {
      return NextResponse.json({
        routeFound: false,
        routeSource: "manual",
        error: "OSRM returned an incomplete road geometry.",
      });
    }

    // Convert OSRM [lng, lat] GeoJSON coordinates to Leaflet [lat, lng] tuples
    const latLngPairs: [number, number][] = geoJsonCoords
      .filter(
        (pair) =>
          Array.isArray(pair) &&
          pair.length >= 2 &&
          isValidCoordinatePair(pair[1], pair[0]),
      )
      .map((pair) => [pair[1], pair[0]]);

    if (latLngPairs.length < 2) {
      return NextResponse.json({
        routeFound: false,
        routeSource: "manual",
        error: "OSRM route geometry contained invalid coordinates.",
      });
    }

    const encodedPolyline = encodePolyline(
      latLngPairs.map(([lat, lng]) => ({ lat, lng })),
    );

    const distanceMeters = Math.max(0, Math.round(route.distance ?? 0));
    const durationSeconds = Math.max(0, Math.round(route.duration ?? 0));

    const payload = {
      routeSource: "osrm" as const,
      distanceMeters,
      durationSeconds,
      encodedPolyline,
      coordinates: latLngPairs,
    };

    routeCache.set(coordString, {
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json({
      routeFound: true,
      ...payload,
    });
  } catch {
    return NextResponse.json(
      {
        routeFound: false,
        routeSource: "manual",
        unavailable: true,
        error:
          "Public OSRM routing server is temporarily unreachable. Coordinates are saved; you can retry road calculation later.",
      },
      { status: 503 },
    );
  }
}
