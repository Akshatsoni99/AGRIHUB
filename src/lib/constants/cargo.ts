import type { CargoCategory, PricingMode } from "@/types/domain";

export const CARGO_CATEGORIES: { id: CargoCategory; label: string; description: string }[] = [
  {
    id: "agriculture",
    label: "Agriculture",
    description: "Seeds, fertilizers, farm inputs, and general agro-commodities",
  },
  {
    id: "grains",
    label: "Grains & Pulses",
    description: "Wheat, rice, millet, pulses, oilseeds in sacks or bulk bags",
  },
  {
    id: "fruits_vegetables",
    label: "Fruits & Vegetables",
    description: "Crated produce, onions, potatoes, seasonal horticulture",
  },
  {
    id: "packaged_goods",
    label: "Packaged Goods",
    description: "Cartons, processed foods, bottled products, retail stock",
  },
  {
    id: "construction_material",
    label: "Construction Material",
    description: "Hardware, pipes, cement bags, rural building supplies",
  },
  {
    id: "general_commercial",
    label: "General Commercial Goods",
    description: "Mixed SME wholesale merchandise and equipment",
  },
  {
    id: "other",
    label: "Other",
    description: "Specify cargo details clearly in the description",
  },
];

export const CARGO_CATEGORY_MAP: Record<CargoCategory, string> = CARGO_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {} as Record<CargoCategory, string>,
);

export const PRICING_MODES: {
  id: PricingMode;
  label: string;
  helper: string;
  unitSuffix: string;
}[] = [
  {
    id: "fixed_contribution",
    label: "Fixed Trip Contribution",
    helper: "Entered amount is the total expected contribution for using the listed available space.",
    unitSuffix: "total trip",
  },
  {
    id: "per_kg",
    label: "Rate per Kilogram",
    helper: "Entered amount is charged per kg of reserved cargo weight.",
    unitSuffix: "/ kg",
  },
  {
    id: "negotiable",
    label: "Negotiable Starting Reference",
    helper: "Entered amount is an indicative baseline; final amount is agreed in chat.",
    unitSuffix: "indicative",
  },
];

export const PRICING_MODE_MAP = PRICING_MODES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<PricingMode, (typeof PRICING_MODES)[number]>,
);

