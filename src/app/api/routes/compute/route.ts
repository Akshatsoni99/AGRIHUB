import { NextResponse } from "next/server";
import { z } from "zod";
import { getGoogleMapsRoutesServerKey } from "@/lib/env";

const waypointSchema = z.object({
  address: z.string().trim().min(2),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

const computeRouteInputSchema = z.object({
  origin: waypointSchema,
  destination: waypointSchema,
  intermediates: z.array(waypointSchema).max(8).default([]),
});

function toGoogleWaypoint(wp: z.infer<typeof waypointSchema>) {
  if (wp.lat != null && wp.lng != null) {
    return {
      location: {
        latLng: {
          latitude: wp.lat,
          longitude: wp.lng,
        },
      },
    };
  }
  return { address: wp.address };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = computeRouteInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid route waypoints" },
        { status: 400 },
      );
    }

    const serverKey = getGoogleMapsRoutesServerKey();
    if (!serverKey) {
      return NextResponse.json({
        configured: false,
        routeSource: "manual",
        message:
          "GOOGLE_MAPS_ROUTES_API_KEY is not configured. Continuing with manual route coordinates.",
      });
    }

    const payload: Record<string, unknown> = {
      origin: toGoogleWaypoint(parsed.data.origin),
      destination: toGoogleWaypoint(parsed.data.destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    };

    if (parsed.data.intermediates.length > 0) {
      payload.intermediates = parsed.data.intermediates.map(toGoogleWaypoint);
    }

    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": serverKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          configured: true,
          routeSource: "manual",
          error: `Google Routes API returned ${res.status}`,
          detail: text.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      routes?: {
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }[];
    };

    const route = data.routes?.[0];
    if (!route) {
      return NextResponse.json({
        configured: true,
        routeSource: "manual",
        error: "No drivable route found between these waypoints.",
      });
    }

    const durationSeconds = route.duration
      ? parseInt(route.duration.replace("s", ""), 10)
      : null;

    return NextResponse.json({
      configured: true,
      routeSource: "google_routes",
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      encodedPolyline: route.polyline?.encodedPolyline ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process route request." },
      { status: 500 },
    );
  }
}

