"use client";

import L from "leaflet";

export function createAgriPinIcon(
  label: string,
  variant: "origin" | "stop" | "destination" | "selected" | "picker",
): L.DivIcon {
  const palette: Record<
    typeof variant,
    { bg: string; border: string; text: string }
  > = {
    origin: { bg: "#173D32", border: "#FFFFFF", text: "#FFFFFF" },
    stop: { bg: "#D5A45B", border: "#173D32", text: "#173D32" },
    destination: { bg: "#1F6B48", border: "#FFFFFF", text: "#FFFFFF" },
    selected: { bg: "#D5A45B", border: "#FFFFFF", text: "#173D32" },
    picker: { bg: "#B83B3B", border: "#FFFFFF", text: "#FFFFFF" },
  };

  const c = palette[variant];
  const html = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:30px;
      height:30px;
      border-radius:9999px;
      background:${c.bg};
      border:2.5px solid ${c.border};
      color:${c.text};
      font-weight:700;
      font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,0.28);
    ">${label}</div>
  `;

  return L.divIcon({
    className: "agri-pin-icon",
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

