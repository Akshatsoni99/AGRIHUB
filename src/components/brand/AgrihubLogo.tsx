import React from "react";
import { cn } from "@/lib/utils";

interface AgrihubLogoProps {
  className?: string;
  showText?: boolean;
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AgrihubLogo({
  className,
  showText = true,
  inverted = false,
  size = "md",
}: AgrihubLogoProps) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 40 : 32;

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="40"
          height="40"
          rx="10"
          fill={inverted ? "#FFFFFF" : "#173D32"}
        />
        {/* Leaf silhouette */}
        <path
          d="M11 25C11 16.7157 17.7157 10 26 10H29V13C29 21.2843 22.2843 28 14 28H11V25Z"
          fill={inverted ? "#173D32" : "#244638"}
          stroke={inverted ? "#173D32" : "#D5A45B"}
          strokeWidth="1.75"
        />
        {/* Logistics route connection line inside leaf */}
        <path
          d="M13.5 26.5L24.5 15.5"
          stroke={inverted ? "#D5A45B" : "#FFFFFF"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Origin & destination route nodes */}
        <circle
          cx="14"
          cy="26"
          r="2.4"
          fill="#D5A45B"
        />
        <circle
          cx="25"
          cy="15"
          r="2.4"
          fill={inverted ? "#173D32" : "#FFFFFF"}
        />
      </svg>
      {showText && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-[family-name:var(--font-manrope)] font-extrabold tracking-tight",
              size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg",
              inverted ? "text-white" : "text-[#173D32]",
            )}
          >
            AGRIHUB
          </span>
          <span
            className={cn(
              "text-[10px] font-medium tracking-wider uppercase",
              inverted ? "text-white/75" : "text-[#718078]",
            )}
          >
            Shared Logistics
          </span>
        </span>
      )}
    </span>
  );
}

