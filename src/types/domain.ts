export type AccountRole = "shipper" | "transporter" | "both";

export type VehicleCategory =
  | "cargo_auto"
  | "e_cargo_auto"
  | "pickup_truck"
  | "loading_van"
  | "heavy_truck";

export type PoolStatus = "OPEN" | "FULL" | "CLOSED" | "CANCELLED" | "COMPLETED";

export type RequestStatus =
  | "PENDING"
  | "ACCEPTED_FOR_DISCUSSION"
  | "NEGOTIATING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED";

export type PricingMode = "fixed_contribution" | "per_kg" | "negotiable";

export type CargoCategory =
  | "agriculture"
  | "grains"
  | "fruits_vegetables"
  | "packaged_goods"
  | "construction_material"
  | "general_commercial"
  | "other";

export type DealStatus = "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface PublicProfile {
  id: string;
  full_name: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  account_type: AccountRole;
  avatar_url: string | null;
  verification_status: "unverified" | "email_verified";
  is_admin: boolean;
  is_suspended: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export interface PrivateContact {
  user_id: string;
  email: string;
  mobile_number: string | null;
}

export interface PoolStop {
  id: string;
  pool_id: string;
  stop_order: number;
  location_name: string;
  city: string | null;
  state: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  estimated_time: string | null;
}

export interface PoolListing {
  id: string;
  pool_code: string;
  owner_id: string;
  vehicle_id: string;
  vehicle_category: VehicleCategory;
  ownership_confirmed: boolean;
  total_capacity_kg: number;
  existing_occupied_kg: number;
  reserved_capacity_kg: number;
  available_capacity_kg: number;
  origin_name: string;
  origin_city: string | null;
  origin_state: string | null;
  origin_place_id: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_name: string;
  destination_city: string | null;
  destination_state: string | null;
  destination_place_id: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_date: string;
  departure_time: string;
  estimated_arrival: string | null;
  pickup_flexibility: string | null;
  delivery_flexibility: string | null;
  route_preferences: string | null;
  route_polyline: string | null;
  route_distance_meters: number | null;
  route_duration_seconds: number | null;
  route_source: "osrm" | "google_routes" | "manual";
  main_cargo_category: CargoCategory;
  cargo_description: string;
  permitted_cargo_categories: CargoCategory[];
  handling_requirements: string | null;
  cargo_dimensions: string | null;
  pricing_mode: PricingMode;
  asking_price: number;
  pickup_contribution: number;
  commercial_terms: string | null;
  status: PoolStatus;
  is_flagged: boolean;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
  owner?: PublicProfile;
  stops?: PoolStop[];
}

export interface PoolRequest {
  id: string;
  pool_id: string;
  requester_id: string;
  pool_owner_id: string;
  required_capacity_kg: number;
  cargo_category: CargoCategory;
  cargo_description: string;
  pickup_location: string;
  pickup_city: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  drop_location: string;
  drop_city: string | null;
  drop_lat: number | null;
  drop_lng: number | null;
  proposed_price: number;
  pricing_note: string | null;
  agreed_capacity_kg: number | null;
  agreed_price: number | null;
  agreed_pickup_point: string | null;
  agreed_drop_point: string | null;
  agreed_departure_time: string | null;
  agreed_conditions: string | null;
  owner_confirmed_terms: boolean;
  requester_confirmed_terms: boolean;
  terms_version: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  pool?: PoolListing;
  requester?: PublicProfile;
  pool_owner?: PublicProfile;
}

export interface Conversation {
  id: string;
  pool_id: string;
  request_id: string;
  owner_id: string;
  requester_id: string;
  last_message_at: string;
  created_at: string;
  pool?: PoolListing;
  request?: PoolRequest;
  owner?: PublicProfile;
  requester?: PublicProfile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: "text" | "proposal" | "system";
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface DealRecord {
  id: string;
  deal_code: string;
  pool_id: string;
  request_id: string;
  conversation_id: string | null;
  owner_id: string;
  requester_id: string;
  agreed_capacity_kg: number;
  agreed_price: number;
  pickup_point: string;
  drop_point: string;
  departure_time: string | null;
  special_conditions: string | null;
  status: DealStatus;
  capacity_released: boolean;
  confirmed_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  pool?: PoolListing;
  owner?: PublicProfile;
  requester?: PublicProfile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  related_pool_id: string | null;
  related_request_id: string | null;
  related_deal_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: PublicProfile;
}

