import type { VehicleCategory } from "@/types/domain";

export interface VehicleCategorySpec {
  id: VehicleCategory;
  label: string;
  shortLabel: string;
  description: string;
  typicalRangeLabel: string;
  minCapacityKg: number;
  maxCapacityKg: number;
  suggestedCapacityKg: number;
  idealFor: string;
}

export const VEHICLE_CATEGORIES: VehicleCategorySpec[] = [
  {
    id: "cargo_auto",
    label: "Cargo Auto",
    shortLabel: "Cargo Auto",
    description: "Three-wheel freight loader for short rural-to-mandi hops and narrow village roads.",
    typicalRangeLabel: "300 – 750 kg",
    minCapacityKg: 100,
    maxCapacityKg: 1000,
    suggestedCapacityKg: 500,
    idealFor: "Small harvest crates, dairy cans, local retail replenishment",
  },
  {
    id: "e_cargo_auto",
    label: "E-Cargo Auto",
    shortLabel: "E-Cargo Auto",
    description: "Electric cargo three-wheeler for low-cost peri-urban and cluster-level collection.",
    typicalRangeLabel: "250 – 650 kg",
    minCapacityKg: 100,
    maxCapacityKg: 850,
    suggestedCapacityKg: 450,
    idealFor: "Fresh produce bundles, FPO aggregation runs, short-haul town deliveries",
  },
  {
    id: "pickup_truck",
    label: "Pickup Truck",
    shortLabel: "Pickup Truck",
    description: "Open or tarpaulin-covered utility pickup built for mixed rural highways and farm tracks.",
    typicalRangeLabel: "800 – 2,000 kg",
    minCapacityKg: 400,
    maxCapacityKg: 2800,
    suggestedCapacityKg: 1200,
    idealFor: "Bagged grains, vegetable sacks, farm inputs, regional distributor runs",
  },
  {
    id: "loading_van",
    label: "Loading Van",
    shortLabel: "Loading Van",
    description: "Closed-body light commercial van offering weather protection for packaged and perishable goods.",
    typicalRangeLabel: "1,000 – 3,500 kg",
    minCapacityKg: 500,
    maxCapacityKg: 4500,
    suggestedCapacityKg: 2000,
    idealFor: "Packaged food, agro-chemicals, graded horticulture, FMCG cartons",
  },
  {
    id: "heavy_truck",
    label: "Heavy Truck",
    shortLabel: "Heavy Truck",
    description: "Inter-district and highway freight carrier for consolidated bulk agricultural and commercial loads.",
    typicalRangeLabel: "4,000 – 25,000 kg",
    minCapacityKg: 2500,
    maxCapacityKg: 35000,
    suggestedCapacityKg: 10000,
    idealFor: "Multi-ton grain lots, bulk construction inputs, inter-city mandi corridors",
  },
];

export const VEHICLE_CATEGORY_MAP: Record<VehicleCategory, VehicleCategorySpec> =
  VEHICLE_CATEGORIES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<VehicleCategory, VehicleCategorySpec>,
  );

export function validateCapacityAgainstVehicleCategory(
  category: VehicleCategory,
  totalCapacityKg: number,
): { valid: boolean; warning?: string; error?: string } {
  const spec = VEHICLE_CATEGORY_MAP[category];
  if (!Number.isFinite(totalCapacityKg) || totalCapacityKg <= 0) {
    return { valid: false, error: "Total carrying capacity must be greater than 0 kg." };
  }
  if (totalCapacityKg < spec.minCapacityKg) {
    return {
      valid: false,
      error: `${spec.label} cargo capacity is typically at least ${spec.minCapacityKg.toLocaleString()} kg (${spec.typicalRangeLabel}). Please verify the vehicle category or entered capacity.`,
    };
  }
  if (totalCapacityKg > spec.maxCapacityKg) {
    return {
      valid: false,
      error: `${spec.label} carrying capacity cannot exceed ${spec.maxCapacityKg.toLocaleString()} kg (${spec.typicalRangeLabel}). Select a larger cargo category if applicable.`,
    };
  }
  return { valid: true };
}

