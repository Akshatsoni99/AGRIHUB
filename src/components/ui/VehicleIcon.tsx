import React from "react";
import type { VehicleCategory } from "@/types/domain";
import { cn } from "@/lib/utils";

interface VehicleIconProps {
  category: VehicleCategory;
  className?: string;
  inverted?: boolean;
}

/**
 * Custom vector illustrations for the five AGRIHUB Indian cargo vehicle categories.
 * Shares one consistent side-profile art direction in AGRIHUB brand colors.
 */
export const VehicleIcon = React.memo(function VehicleIcon({
  category,
  className,
  inverted = false,
}: VehicleIconProps) {
  const bodyPrimary = inverted ? "#FFFFFF" : "#173D32";
  const bodySecondary = inverted ? "#D5A45B" : "#244638";
  const accent = "#D5A45B";
  const cabinGlass = inverted ? "#173D32" : "#F4F5F1";
  const cargoFill = inverted ? "rgba(255,255,255,0.18)" : "#F4F5F1";
  const wheelOuter = inverted ? "#0E2820" : "#242B31";
  const wheelHub = "#D5A45B";
  const strokeTone = inverted ? "#FFFFFF" : "#173D32";

  switch (category) {
    case "cargo_auto":
      return (
        <svg
          viewBox="0 0 120 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn("shrink-0", className)}
        >
          {/* Ground shadow */}
          <ellipse cx="60" cy="64" rx="46" ry="3.5" fill={strokeTone} fillOpacity="0.12" />
          {/* Rear cargo flatbed & side mesh frame */}
          <rect
            x="14"
            y="26"
            width="46"
            height="22"
            rx="3"
            fill={cargoFill}
            stroke={strokeTone}
            strokeWidth="2.2"
          />
          {/* Sacks / crates inside rear cargo carrier */}
          <rect x="19" y="19" width="16" height="9" rx="2.5" fill={accent} stroke={strokeTone} strokeWidth="1.5" />
          <rect x="37" y="21" width="17" height="7" rx="2" fill={bodySecondary} stroke={strokeTone} strokeWidth="1.5" />
          <line x1="25" y1="26" x2="25" y2="48" stroke={strokeTone} strokeWidth="1.4" strokeOpacity="0.45" />
          <line x1="37" y1="26" x2="37" y2="48" stroke={strokeTone} strokeWidth="1.4" strokeOpacity="0.45" />
          <line x1="49" y1="26" x2="49" y2="48" stroke={strokeTone} strokeWidth="1.4" strokeOpacity="0.45" />

          {/* Classic curved Indian auto-rickshaw front cabin & canopy */}
          <path
            d="M60 48V18C60 13.5 63.5 11 68 11H84C88.5 11 91.5 14 93.5 20L99 34C102 35.5 104 39 104 44V49H60V48Z"
            fill={bodyPrimary}
          />
          {/* Front sloped windshield */}
          <path
            d="M78 15H85.5C88 15 89.5 17 91 21L94.5 31H78V15Z"
            fill={cabinGlass}
            stroke={strokeTone}
            strokeWidth="1.4"
          />
          {/* Open side driver cabin cutout + handlebar */}
          <path
            d="M64 16H74V36H64V16Z"
            fill={cabinGlass}
          />
          <path d="M75 34L81 30" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          {/* Auto-rickshaw petrol accent stripe */}
          <path d="M60 41H104" stroke={accent} strokeWidth="3" />
          {/* Round front headlight */}
          <circle cx="102.5" cy="36" r="3" fill={accent} stroke={strokeTone} strokeWidth="1.2" />
          {/* Front mudguard */}
          <path d="M84 51C84 44.5 96 44.5 96 51" stroke={strokeTone} strokeWidth="2.4" strokeLinecap="round" />
          {/* Chassis bar */}
          <rect x="14" y="48" width="84" height="4" rx="2" fill={bodySecondary} />
          {/* Rear wheel & single front wheel (3-wheeler proportions) */}
          <circle cx="29" cy="54" r="9.5" fill={wheelOuter} />
          <circle cx="29" cy="54" r="4" fill={wheelHub} />
          <circle cx="90" cy="54" r="9.5" fill={wheelOuter} />
          <circle cx="90" cy="54" r="4" fill={wheelHub} />
        </svg>
      );

    case "e_cargo_auto":
      return (
        <svg
          viewBox="0 0 120 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn("shrink-0", className)}
        >
          <ellipse cx="60" cy="64" rx="46" ry="3.5" fill={strokeTone} fillOpacity="0.12" />
          {/* High-rail compact EV cargo box */}
          <rect
            x="14"
            y="22"
            width="47"
            height="25"
            rx="4"
            fill={cargoFill}
            stroke={strokeTone}
            strokeWidth="2.2"
          />
          <rect x="19" y="27" width="37" height="4.5" rx="1.5" fill={accent} fillOpacity="0.85" />
          <rect x="19" y="35" width="22" height="6" rx="1.5" fill={bodySecondary} fillOpacity="0.3" />
          {/* Modern angular EV cab */}
          <path
            d="M63 47V16C63 13.5 65 12 67.5 12H83C86.5 12 89.5 14 91.5 17.5L101 33C103 36 104 39.5 104 44V47H63Z"
            fill={bodyPrimary}
          />
          {/* Angular EV windshield */}
          <path
            d="M78 16H84.5C86.8 16 88.5 17.3 90 19.8L96 30H78V16Z"
            fill={cabinGlass}
          />
          {/* Cab door window */}
          <rect x="66" y="16" width="9" height="14" rx="2" fill={cabinGlass} />
          {/* LED headlight bar */}
          <rect x="98" y="33" width="5" height="3.5" rx="1.2" fill={accent} />
          {/* Under-deck EV battery module with lightning bolt */}
          <rect
            x="40"
            y="47"
            width="28"
            height="8"
            rx="2.5"
            fill={inverted ? "#D5A45B" : "#1F6B48"}
            stroke={strokeTone}
            strokeWidth="1.5"
          />
          <path
            d="M55 48.5L51.5 51.5H54.5L53 54L57 50.8H54L55 48.5Z"
            fill={inverted ? "#173D32" : "#FFFFFF"}
          />
          {/* EV side emblem */}
          <path d="M72 36L69.5 40H72.5L71 43.5L75 39H72L72 36Z" fill={accent} />
          {/* Compact EV wheels */}
          <circle cx="28" cy="54.5" r="8.8" fill={wheelOuter} />
          <circle cx="28" cy="54.5" r="3.6" fill={wheelHub} />
          <circle cx="91" cy="54.5" r="8.8" fill={wheelOuter} />
          <circle cx="91" cy="54.5" r="3.6" fill={wheelHub} />
        </svg>
      );

    case "pickup_truck":
      return (
        <svg
          viewBox="0 0 120 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn("shrink-0", className)}
        >
          <ellipse cx="60" cy="64" rx="49" ry="3.5" fill={strokeTone} fillOpacity="0.12" />
          {/* Open rear cargo bed with slatted side rails */}
          <rect
            x="10"
            y="29"
            width="47"
            height="19"
            rx="2.5"
            fill={cargoFill}
            stroke={strokeTone}
            strokeWidth="2.2"
          />
          {/* Farm cargo crates inside open bed */}
          <rect x="14" y="21" width="18" height="8" rx="2" fill={accent} stroke={strokeTone} strokeWidth="1.4" />
          <rect x="34" y="23" width="17" height="6" rx="1.8" fill={bodySecondary} stroke={strokeTone} strokeWidth="1.4" />
          <line x1="12" y1="36" x2="55" y2="36" stroke={strokeTone} strokeWidth="1.6" strokeOpacity="0.4" />
          {/* Pickup cab & front bonnet */}
          <path
            d="M57 48V18C57 15.5 59 14 61.5 14H78C81 14 83.5 15.5 85.5 18.5L92 29H105C108 29 110 31 110 34V48H57Z"
            fill={bodyPrimary}
          />
          {/* Side cab window */}
          <path
            d="M62 18H77C79 18 80.5 19 82 21.5L86 28.5H62V18Z"
            fill={cabinGlass}
          />
          {/* Door handle & grille/headlight */}
          <rect x="65" y="34" width="6" height="2" rx="1" fill={accent} />
          <rect x="105" y="34" width="4.5" height="5" rx="1.2" fill={accent} />
          {/* Lower rocker & wheel arches */}
          <rect x="10" y="47" width="100" height="4" rx="1.5" fill={bodySecondary} />
          {/* 4-wheel stance (2 side wheels visible) */}
          <circle cx="30" cy="54" r="9.5" fill={wheelOuter} />
          <circle cx="30" cy="54" r="4.2" fill={wheelHub} />
          <circle cx="91" cy="54" r="9.5" fill={wheelOuter} />
          <circle cx="91" cy="54" r="4.2" fill={wheelHub} />
        </svg>
      );

    case "loading_van":
      return (
        <svg
          viewBox="0 0 120 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn("shrink-0", className)}
        >
          <ellipse cx="60" cy="64" rx="50" ry="3.5" fill={strokeTone} fillOpacity="0.12" />
          {/* Closed insulated commercial cargo box */}
          <rect
            x="10"
            y="14"
            width="60"
            height="35"
            rx="3.5"
            fill={cargoFill}
            stroke={strokeTone}
            strokeWidth="2.2"
          />
          {/* Brand stripe & panel ribs on box */}
          <rect x="11" y="30" width="58" height="5" fill={bodySecondary} />
          <rect x="11" y="35" width="58" height="2.5" fill={accent} />
          <line x1="28" y1="16" x2="28" y2="28" stroke={strokeTone} strokeWidth="1.4" strokeOpacity="0.35" />
          <line x1="48" y1="16" x2="48" y2="28" stroke={strokeTone} strokeWidth="1.4" strokeOpacity="0.35" />
          {/* Rear door latch accent */}
          <rect x="13" y="21" width="3" height="10" rx="1" fill={accent} />
          {/* Front van cab */}
          <path
            d="M72 49V19C72 16.5 74 15 76.5 15H89C93.5 15 97 17.5 99.5 22L106.5 34C108.5 37 109.5 40 109.5 44V49H72Z"
            fill={bodyPrimary}
          />
          {/* Front windshield & cab window */}
          <path
            d="M77 19H88C91 19 93.5 20.5 95.5 24L100 32H77V19Z"
            fill={cabinGlass}
          />
          <rect x="104" y="38" width="5" height="4.5" rx="1.2" fill={accent} />
          <rect x="10" y="48" width="99.5" height="3.5" rx="1.5" fill={bodySecondary} />
          {/* 4-wheel stance */}
          <circle cx="30" cy="54.5" r="9" fill={wheelOuter} />
          <circle cx="30" cy="54.5" r="3.8" fill={wheelHub} />
          <circle cx="92" cy="54.5" r="9" fill={wheelOuter} />
          <circle cx="92" cy="54.5" r="3.8" fill={wheelHub} />
        </svg>
      );

    case "heavy_truck":
      return (
        <svg
          viewBox="0 0 120 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={cn("shrink-0", className)}
        >
          <ellipse cx="60" cy="64" rx="53" ry="3.5" fill={strokeTone} fillOpacity="0.12" />
          {/* Heavy highway freight carrier body */}
          <rect
            x="6"
            y="10"
            width="72"
            height="38"
            rx="3.5"
            fill={cargoFill}
            stroke={strokeTone}
            strokeWidth="2.2"
          />
          {/* Structural ribs & amber beltline */}
          <rect x="7" y="33" width="70" height="4.5" fill={accent} />
          <line x1="22" y1="12" x2="22" y2="32" stroke={strokeTone} strokeWidth="1.6" strokeOpacity="0.35" />
          <line x1="40" y1="12" x2="40" y2="32" stroke={strokeTone} strokeWidth="1.6" strokeOpacity="0.35" />
          <line x1="58" y1="12" x2="58" y2="32" stroke={strokeTone} strokeWidth="1.6" strokeOpacity="0.35" />
          {/* Heavy cab-over-engine front cabin */}
          <path
            d="M80 48V15C80 12.5 82 11 84.5 11H103C106.5 11 109.5 13.5 110.5 17L113 31V48H80Z"
            fill={bodyPrimary}
          />
          {/* Wide heavy truck windshield */}
          <path
            d="M85 15H101.5C103.8 15 105.5 16.5 106.5 19L108.5 28H85V15Z"
            fill={cabinGlass}
          />
          {/* Heavy front grille, bumper, and headlight */}
          <rect x="97" y="33" width="12" height="7" rx="1.5" fill={bodySecondary} />
          <rect x="107" y="40" width="5.5" height="4" rx="1" fill={accent} />
          {/* Heavy chassis rail */}
          <rect x="6" y="47" width="107" height="4.5" rx="1.5" fill={bodySecondary} />
          {/* Multi-axle dual rear wheels + front steer wheel */}
          <circle cx="22" cy="54.5" r="8.8" fill={wheelOuter} />
          <circle cx="22" cy="54.5" r="3.6" fill={wheelHub} />
          <circle cx="43" cy="54.5" r="8.8" fill={wheelOuter} />
          <circle cx="43" cy="54.5" r="3.6" fill={wheelHub} />
          <circle cx="96" cy="54.5" r="8.8" fill={wheelOuter} />
          <circle cx="96" cy="54.5" r="3.6" fill={wheelHub} />
        </svg>
      );
  }
});
