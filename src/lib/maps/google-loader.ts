"use client";

import { getGoogleMapsBrowserConfig } from "@/lib/env";
import type { GoogleMapsNamespace } from "@/lib/maps/google-types";

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}

let loadPromise: Promise<GoogleMapsNamespace | null> | null = null;

export function loadGoogleMapsApi(): Promise<GoogleMapsNamespace | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const { apiKey, isConfigured } = getGoogleMapsBrowserConfig();
  if (!isConfigured) {
    return Promise.resolve(null);
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const existing = document.getElementById("agrihub-google-maps-script");
    if (existing) {
      existing.addEventListener("load", () =>
        resolve(window.google?.maps ?? null),
      );
      existing.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.id = "agrihub-google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places,geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps ?? null);
    script.onerror = () => {
      loadPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
