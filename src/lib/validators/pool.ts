import { z } from "zod";
import { validateCapacityAgainstVehicleCategory } from "@/lib/constants/vehicles";

export const accountRoleSchema = z.enum(["shipper", "transporter", "both"]);

export const vehicleCategorySchema = z.enum([
  "cargo_auto",
  "e_cargo_auto",
  "pickup_truck",
  "loading_van",
  "heavy_truck",
]);

export const cargoCategorySchema = z.enum([
  "agriculture",
  "grains",
  "fruits_vegetables",
  "packaged_goods",
  "construction_material",
  "general_commercial",
  "other",
]);

export const pricingModeSchema = z.enum([
  "fixed_contribution",
  "per_kg",
  "negotiable",
]);

export const poolStopInputSchema = z.object({
  location_name: z.string().trim().min(2, "Stop location is required").max(160),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  place_id: z.string().trim().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  estimated_time: z.string().trim().max(60).optional().nullable(),
});

export const createPoolSchema = z
  .object({
    vehicle_category: vehicleCategorySchema,
    registration_number: z
      .string()
      .trim()
      .min(4, "Enter a valid vehicle registration number")
      .max(24, "Registration number is too long"),
    make_model: z.string().trim().max(80).optional().nullable(),
    vehicle_notes: z.string().trim().max(300).optional().nullable(),
    ownership_confirmed: z.boolean().refine((v) => v === true, {
      message:
        "You must confirm that you own or are authorised to list this vehicle.",
    }),
    total_capacity_kg: z.coerce
      .number()
      .int("Capacity must be a whole number in kg")
      .positive("Total capacity must be positive"),
    existing_occupied_kg: z.coerce
      .number()
      .int("Existing cargo must be a whole number in kg")
      .min(0, "Existing cargo cannot be negative"),

    origin_name: z.string().trim().min(2, "Origin is required").max(160),
    origin_city: z.string().trim().max(100).optional().nullable(),
    origin_state: z.string().trim().max(100).optional().nullable(),
    origin_place_id: z.string().trim().max(200).optional().nullable(),
    origin_lat: z.number().min(-90).max(90).optional().nullable(),
    origin_lng: z.number().min(-180).max(180).optional().nullable(),

    destination_name: z.string().trim().min(2, "Destination is required").max(160),
    destination_city: z.string().trim().max(100).optional().nullable(),
    destination_state: z.string().trim().max(100).optional().nullable(),
    destination_place_id: z.string().trim().max(200).optional().nullable(),
    destination_lat: z.number().min(-90).max(90).optional().nullable(),
    destination_lng: z.number().min(-180).max(180).optional().nullable(),

    stops: z.array(poolStopInputSchema).max(8, "Maximum 8 intermediate stops").default([]),

    departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid departure date required"),
    departure_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Valid departure time required"),
    estimated_arrival: z.string().optional().nullable(),
    pickup_flexibility: z.string().trim().max(120).optional().nullable(),
    delivery_flexibility: z.string().trim().max(120).optional().nullable(),
    route_preferences: z.string().trim().max(300).optional().nullable(),

    route_polyline: z.string().optional().nullable(),
    route_distance_meters: z.number().int().nonnegative().optional().nullable(),
    route_duration_seconds: z.number().int().nonnegative().optional().nullable(),
    route_source: z.enum(["google_routes", "manual"]).default("manual"),

    main_cargo_category: cargoCategorySchema,
    cargo_description: z
      .string()
      .trim()
      .min(10, "Please describe the current cargo or available space (at least 10 characters)")
      .max(1000),
    permitted_cargo_categories: z
      .array(cargoCategorySchema)
      .min(1, "Select at least one permitted cargo category"),
    handling_requirements: z.string().trim().max(300).optional().nullable(),
    cargo_dimensions: z.string().trim().max(120).optional().nullable(),

    pricing_mode: pricingModeSchema,
    asking_price: z.coerce.number().min(0, "Price cannot be negative").max(10000000),
    pickup_contribution: z.coerce.number().min(0).max(1000000).default(0),
    commercial_terms: z.string().trim().max(600).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const specCheck = validateCapacityAgainstVehicleCategory(
      data.vehicle_category,
      data.total_capacity_kg,
    );
    if (!specCheck.valid && specCheck.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total_capacity_kg"],
        message: specCheck.error,
      });
    }

    if (data.existing_occupied_kg >= data.total_capacity_kg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["existing_occupied_kg"],
        message:
          "Existing occupied cargo must be less than total capacity so available pool space remains positive.",
      });
    }

    if (
      data.origin_name.trim().toLowerCase() ===
      data.destination_name.trim().toLowerCase()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destination_name"],
        message: "Destination must differ from origin.",
      });
    }
  });

export const createPoolRequestSchema = z.object({
  pool_id: z.string().uuid(),
  required_capacity_kg: z.coerce
    .number()
    .int("Capacity must be a whole number in kg")
    .positive("Required capacity must be positive"),
  cargo_category: cargoCategorySchema,
  cargo_description: z
    .string()
    .trim()
    .min(6, "Describe your cargo clearly")
    .max(600),
  pickup_location: z.string().trim().min(2, "Pickup location is required").max(160),
  pickup_city: z.string().trim().max(100).optional().nullable(),
  pickup_lat: z.number().min(-90).max(90).optional().nullable(),
  pickup_lng: z.number().min(-180).max(180).optional().nullable(),
  drop_location: z.string().trim().min(2, "Drop location is required").max(160),
  drop_city: z.string().trim().max(100).optional().nullable(),
  drop_lat: z.number().min(-90).max(90).optional().nullable(),
  drop_lng: z.number().min(-180).max(180).optional().nullable(),
  proposed_price: z.coerce.number().min(0, "Proposed price cannot be negative").max(10000000),
  pricing_note: z.string().trim().max(300).optional().nullable(),
});

export const proposeDealTermsSchema = z.object({
  request_id: z.string().uuid(),
  agreed_capacity_kg: z.coerce.number().int().positive(),
  agreed_price: z.coerce.number().min(0).max(10000000),
  agreed_pickup_point: z.string().trim().min(2).max(160),
  agreed_drop_point: z.string().trim().min(2).max(160),
  agreed_departure_time: z.string().trim().min(2).max(80),
  agreed_conditions: z.string().trim().max(500).optional().nullable(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  mobile_number: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{8,18}$/, "Enter a valid mobile number"),
  city: z.string().trim().min(2, "City or town is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  business_name: z.string().trim().max(120).optional().nullable(),
  account_type: accountRoleSchema,
});

export const reviewSchema = z.object({
  deal_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().nullable(),
});

export const reportPoolSchema = z.object({
  pool_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(500).optional().nullable(),
});

