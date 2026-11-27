import React from "react";
import {
  Bike,
  Zap,
  Truck,
  PackageCheck,
  Container,
} from "lucide-react";
import type { VehicleCategory } from "@/types/domain";
import { cn } from "@/lib/utils";

interface VehicleIconProps {
  category: VehicleCategory;
  className?: string;
}

export function VehicleIcon({ category, className }: VehicleIconProps) {
  const iconClass = cn("shrink-0", className);
  switch (category) {
    case "cargo_auto":
      return <Bike className={iconClass} aria-hidden="true" />;
    case "e_cargo_auto":
      return <Zap className={iconClass} aria-hidden="true" />;
    case "pickup_truck":
      return <Truck className={iconClass} aria-hidden="true" />;
    case "loading_van":
      return <PackageCheck className={iconClass} aria-hidden="true" />;
    case "heavy_truck":
      return <Container className={iconClass} aria-hidden="true" />;
  }
}

