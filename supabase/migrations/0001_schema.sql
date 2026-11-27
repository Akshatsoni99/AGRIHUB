-- AGRIHUB Migration 0001: Core Schema, Constraints, and Indexes
-- Enables UUID generation and creates all required domain tables.

create extension if not exists "pgcrypto";

-- Helper trigger function for updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. PROFILES (public-safe user attributes; private contacts kept separate)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  business_name text,
  city text,
  state text,
  account_type text not null default 'both' check (account_type in ('shipper', 'transporter', 'both')),
  avatar_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'email_verified')),
  is_admin boolean not null default false,
  is_suspended boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 1b. PROFILE PRIVATE CONTACTS (never exposed on public listings)
create table if not exists public.profile_private_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  mobile_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profile_private_contacts_updated_at on public.profile_private_contacts;
create trigger trg_profile_private_contacts_updated_at
  before update on public.profile_private_contacts
  for each row execute function public.set_updated_at();

-- 2. VEHICLES (registration number restricted to owner, admins, and confirmed deal partners)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('cargo_auto', 'e_cargo_auto', 'pickup_truck', 'loading_van', 'heavy_truck')),
  registration_number text not null check (char_length(trim(registration_number)) >= 4),
  make_model text,
  notes text,
  total_capacity_kg integer not null check (total_capacity_kg > 0),
  ownership_confirmed boolean not null check (ownership_confirmed = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_owner_id on public.vehicles(owner_id);

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- 3. POOLS (shared truck capacity listings)
create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  pool_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  vehicle_category text not null check (vehicle_category in ('cargo_auto', 'e_cargo_auto', 'pickup_truck', 'loading_van', 'heavy_truck')),
  ownership_confirmed boolean not null check (ownership_confirmed = true),
  total_capacity_kg integer not null check (total_capacity_kg > 0),
  existing_occupied_kg integer not null default 0 check (existing_occupied_kg >= 0),
  reserved_capacity_kg integer not null default 0 check (reserved_capacity_kg >= 0),
  available_capacity_kg integer generated always as (total_capacity_kg - existing_occupied_kg - reserved_capacity_kg) stored,
  origin_name text not null check (char_length(trim(origin_name)) >= 2),
  origin_city text,
  origin_state text,
  origin_place_id text,
  origin_lat double precision,
  origin_lng double precision,
  destination_name text not null check (char_length(trim(destination_name)) >= 2),
  destination_city text,
  destination_state text,
  destination_place_id text,
  destination_lat double precision,
  destination_lng double precision,
  departure_date date not null,
  departure_time time not null,
  estimated_arrival timestamptz,
  pickup_flexibility text,
  delivery_flexibility text,
  route_preferences text,
  route_polyline text,
  route_distance_meters integer check (route_distance_meters is null or route_distance_meters >= 0),
  route_duration_seconds integer check (route_duration_seconds is null or route_duration_seconds >= 0),
  route_source text not null default 'manual' check (route_source in ('google_routes', 'manual')),
  main_cargo_category text not null check (main_cargo_category in ('agriculture', 'grains', 'fruits_vegetables', 'packaged_goods', 'construction_material', 'general_commercial', 'other')),
  cargo_description text not null check (char_length(trim(cargo_description)) >= 10),
  permitted_cargo_categories text[] not null default '{}',
  handling_requirements text,
  cargo_dimensions text,
  pricing_mode text not null check (pricing_mode in ('fixed_contribution', 'per_kg', 'negotiable')),
  asking_price numeric(12, 2) not null check (asking_price >= 0),
  pickup_contribution numeric(12, 2) not null default 0 check (pickup_contribution >= 0),
  commercial_terms text,
  status text not null default 'OPEN' check (status in ('OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED')),
  is_flagged boolean not null default false,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pool_capacity_invariant check (existing_occupied_kg + reserved_capacity_kg <= total_capacity_kg),
  constraint chk_pool_distinct_endpoints check (trim(lower(origin_name)) <> trim(lower(destination_name)))
);

create index if not exists idx_pools_status_departure on public.pools(status, departure_date);
create index if not exists idx_pools_owner_id on public.pools(owner_id);
create index if not exists idx_pools_vehicle_category on public.pools(vehicle_category);
create index if not exists idx_pools_available_capacity on public.pools(available_capacity_kg);

drop trigger if exists trg_pools_updated_at on public.pools;
create trigger trg_pools_updated_at
  before update on public.pools
  for each row execute function public.set_updated_at();

-- 4. POOL STOPS (intermediate stops along a pool route)
create table if not exists public.pool_stops (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  stop_order integer not null check (stop_order >= 1),
  location_name text not null check (char_length(trim(location_name)) >= 2),
  city text,
  state text,
  place_id text,
  lat double precision,
  lng double precision,
  estimated_time text,
  created_at timestamptz not null default now(),
  unique (pool_id, stop_order)
);

create index if not exists idx_pool_stops_pool_id on public.pool_stops(pool_id);

-- 5. POOL REQUESTS (shipper requests to join a pool and negotiate terms)
create table if not exists public.pool_requests (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  pool_owner_id uuid not null references public.profiles(id) on delete cascade,
  required_capacity_kg integer not null check (required_capacity_kg > 0),
  cargo_category text not null check (cargo_category in ('agriculture', 'grains', 'fruits_vegetables', 'packaged_goods', 'construction_material', 'general_commercial', 'other')),
  cargo_description text not null check (char_length(trim(cargo_description)) >= 6),
  pickup_location text not null check (char_length(trim(pickup_location)) >= 2),
  pickup_city text,
  pickup_lat double precision,
  pickup_lng double precision,
  drop_location text not null check (char_length(trim(drop_location)) >= 2),
  drop_city text,
  drop_lat double precision,
  drop_lng double precision,
  proposed_price numeric(12, 2) not null check (proposed_price >= 0),
  pricing_note text,
  agreed_capacity_kg integer check (agreed_capacity_kg is null or agreed_capacity_kg > 0),
  agreed_price numeric(12, 2) check (agreed_price is null or agreed_price >= 0),
  agreed_pickup_point text,
  agreed_drop_point text,
  agreed_departure_time text,
  agreed_conditions text,
  owner_confirmed_terms boolean not null default false,
  requester_confirmed_terms boolean not null default false,
  terms_version integer not null default 1,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_request_no_self_join check (requester_id <> pool_owner_id)
);

create unique index if not exists idx_unique_active_pool_request
  on public.pool_requests(pool_id, requester_id)
  where status in ('PENDING', 'ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING');

create index if not exists idx_pool_requests_pool_id on public.pool_requests(pool_id);
create index if not exists idx_pool_requests_requester_id on public.pool_requests(requester_id);
create index if not exists idx_pool_requests_owner_id on public.pool_requests(pool_owner_id);

drop trigger if exists trg_pool_requests_updated_at on public.pool_requests;
create trigger trg_pool_requests_updated_at
  before update on public.pool_requests
  for each row execute function public.set_updated_at();

-- 6. CONVERSATIONS (private chat threads linked to pool requests)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  request_id uuid not null unique references public.pool_requests(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint chk_conversation_distinct_parties check (owner_id <> requester_id)
);

create index if not exists idx_conversations_owner_id on public.conversations(owner_id);
create index if not exists idx_conversations_requester_id on public.conversations(requester_id);

-- 7. MESSAGES (real-time PostgreSQL chat history)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  message_type text not null default 'text' check (message_type in ('text', 'proposal', 'system')),
  body text not null check (char_length(trim(body)) >= 1),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);

-- 8. DEALS (mutually confirmed capacity reservations)
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_code text not null unique,
  pool_id uuid not null references public.pools(id) on delete restrict,
  request_id uuid not null unique references public.pool_requests(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  agreed_capacity_kg integer not null check (agreed_capacity_kg > 0),
  agreed_price numeric(12, 2) not null check (agreed_price >= 0),
  pickup_point text not null,
  drop_point text not null,
  departure_time text,
  special_conditions text,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
  capacity_released boolean not null default false,
  confirmed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  updated_at timestamptz not null default now(),
  constraint chk_deal_distinct_parties check (owner_id <> requester_id)
);

create index if not exists idx_deals_owner_id on public.deals(owner_id);
create index if not exists idx_deals_requester_id on public.deals(requester_id);
create index if not exists idx_deals_pool_id on public.deals(pool_id);

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- 8b. DEAL TRANSACTIONS (audit log of capacity reservations & releases)
create table if not exists public.deal_transactions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  pool_id uuid not null references public.pools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('DEAL_CONFIRMED', 'DEAL_CANCELLED', 'SHIPMENT_IN_TRANSIT', 'SHIPMENT_DELIVERED')),
  capacity_delta_kg integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_transactions_deal_id on public.deal_transactions(deal_id);

-- 9. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  related_pool_id uuid,
  related_request_id uuid,
  related_deal_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);

-- 10. REVIEWS (permitted only after a delivered confirmed deal; no self-reviews)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint chk_review_no_self check (reviewer_id <> reviewee_id),
  unique (deal_id, reviewer_id)
);

create index if not exists idx_reviews_reviewee_id on public.reviews(reviewee_id);

-- 11. POOL REPORTS (moderation reports for Admin panel)
create table if not exists public.pool_reports (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) >= 3),
  details text,
  status text not null default 'OPEN' check (status in ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED')),
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pool_reports_status on public.pool_reports(status, created_at desc);

drop trigger if exists trg_pool_reports_updated_at on public.pool_reports;
create trigger trg_pool_reports_updated_at
  before update on public.pool_reports
  for each row execute function public.set_updated_at();

-- 12. PRODUCE DEMAND LISTINGS (supporting agricultural trade demand generator)
create table if not exists public.produce_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  cargo_category text not null check (cargo_category in ('agriculture', 'grains', 'fruits_vegetables', 'packaged_goods', 'construction_material', 'general_commercial', 'other')),
  quantity_kg integer not null check (quantity_kg > 0),
  origin_name text not null check (char_length(trim(origin_name)) >= 2),
  preferred_destination text,
  ready_date date not null,
  notes text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'MATCHED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_produce_listings_status_date on public.produce_listings(status, ready_date);

drop trigger if exists trg_produce_listings_updated_at on public.produce_listings;
create trigger trg_produce_listings_updated_at
  before update on public.produce_listings
  for each row execute function public.set_updated_at();
