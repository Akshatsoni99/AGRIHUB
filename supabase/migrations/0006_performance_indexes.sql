-- Performance audit composite indexes for common AGRIHUB filter/sort queries.
-- Additive only: preserves all existing tables, constraints, triggers, and RLS policies.

create index if not exists idx_pools_status_capacity_departure
  on public.pools (status, available_capacity_kg, departure_date);

create index if not exists idx_pools_owner_created
  on public.pools (owner_id, created_at desc);

create index if not exists idx_pool_requests_owner_created
  on public.pool_requests (pool_owner_id, created_at desc);

create index if not exists idx_pool_requests_requester_created
  on public.pool_requests (requester_id, created_at desc);

create index if not exists idx_deals_owner_confirmed
  on public.deals (owner_id, confirmed_at desc);

create index if not exists idx_deals_requester_confirmed
  on public.deals (requester_id, confirmed_at desc);

create index if not exists idx_conversations_owner_last_msg
  on public.conversations (owner_id, last_message_at desc);

create index if not exists idx_conversations_requester_last_msg
  on public.conversations (requester_id, last_message_at desc);

