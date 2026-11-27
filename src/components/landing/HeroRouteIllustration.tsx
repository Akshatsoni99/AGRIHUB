import React from "react";

export function HeroRouteIllustration() {
  return (
    <div className="agri-card overflow-hidden bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-[#E4E8E2] pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#718078]">
            Shared Corridor Schematic
          </p>
          <p className="text-sm font-bold text-[#173D32]">
            Capacity Pooling Workflow
          </p>
        </div>
        <span className="rounded-full bg-[#173D32]/10 px-2.5 py-1 text-xs font-semibold text-[#173D32]">
          Mandi Corridor
        </span>
      </div>

      <svg
        viewBox="0 0 520 300"
        className="h-auto w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Illustration of shared truck capacity along a rural-to-market route with intermediate pickup stops"
      >
        {/* Subtle topographic background grid */}
        <rect width="520" height="300" rx="12" fill="#F4F5F1" />
        <path d="M0 75H520M0 150H520M0 225H520" stroke="#E4E8E2" strokeWidth="1" />
        <path d="M130 0V300M260 0V300M390 0V300" stroke="#E4E8E2" strokeWidth="1" />

        {/* Secondary branch lines */}
        <path
          d="M90 220C140 205 170 170 210 155"
          stroke="#718078"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d="M325 130C365 110 385 85 430 70"
          stroke="#718078"
          strokeWidth="2"
          strokeDasharray="5 5"
        />

        {/* Primary transport corridor */}
        <path
          d="M55 215C130 195 160 165 215 155C270 145 305 140 345 115C385 90 420 85 465 75"
          stroke="#173D32"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Origin Node */}
        <circle cx="55" cy="215" r="11" fill="#173D32" />
        <circle cx="55" cy="215" r="4.5" fill="#FFFFFF" />
        <rect x="24" y="234" width="96" height="40" rx="8" fill="#FFFFFF" stroke="#E4E8E2" />
        <text x="34" y="251" fill="#173D32" fontSize="11" fontWeight="700">
          Origin Hub
        </text>
        <text x="34" y="266" fill="#718078" fontSize="10">
          60% loaded
        </text>

        {/* Intermediate Stop 1 (Pickup Pool Join) */}
        <circle cx="215" cy="155" r="10" fill="#D5A45B" />
        <circle cx="215" cy="155" r="4" fill="#173D32" />
        <rect x="162" y="176" width="122" height="44" rx="8" fill="#FFFFFF" stroke="#D5A45B" />
        <text x="172" y="195" fill="#242B31" fontSize="11" fontWeight="700">
          Stop 1: Farm Cluster
        </text>
        <text x="172" y="210" fill="#718078" fontSize="10">
          +400 kg pooled
        </text>

        {/* Intermediate Stop 2 */}
        <circle cx="345" cy="115" r="9" fill="#244638" />
        <circle cx="345" cy="115" r="3.5" fill="#FFFFFF" />
        <rect x="275" y="46" width="132" height="44" rx="8" fill="#FFFFFF" stroke="#E4E8E2" />
        <text x="285" y="65" fill="#242B31" fontSize="11" fontWeight="700">
          Stop 2: Town Depot
        </text>
        <text x="285" y="80" fill="#718078" fontSize="10">
          Partial drop / load
        </text>

        {/* Destination Node */}
        <circle cx="465" cy="75" r="11" fill="#1F6B48" />
        <circle cx="465" cy="75" r="4.5" fill="#FFFFFF" />
        <rect x="394" y="96" width="106" height="40" rx="8" fill="#173D32" />
        <text x="405" y="114" fill="#FFFFFF" fontSize="11" fontWeight="700">
          Market / Mandi
        </text>
        <text x="405" y="128" fill="#D5A45B" fontSize="10">
          Shared arrival
        </text>
      </svg>

      {/* Cargo capacity bar preview */}
      <div className="mt-4 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-[#242B31]">
          <span>Vehicle Load Utilization Model</span>
          <span className="text-[#173D32]">Existing + Pooled = Optimal</span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-white border border-[#E4E8E2]">
          <div className="h-full bg-[#173D32]" style={{ width: "52%" }} title="Transporter Cargo" />
          <div className="h-full bg-[#D5A45B]" style={{ width: "30%" }} title="Reserved Pool Space" />
          <div className="h-full bg-transparent" style={{ width: "18%" }} title="Available Capacity" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#718078]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#173D32]" />
            Base Cargo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D5A45B]" />
            Confirmed Pool Share
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[#718078] bg-white" />
            Open for Request
          </span>
        </div>
      </div>
    </div>
  );
}

