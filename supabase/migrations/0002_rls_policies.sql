-- AGRIHUB Migration 0002: Row Level Security (RLS), Grants, and Non-Recursive Policies

-- Enable RLS on all tables first
alter table public.profiles enable row level security;
alter table public.profile_private_contacts enable row level security;
alter table public.vehicles enable row level security;
alter table public.pools enable row level security;
alter table public.pool_stops enable row level security;
alter table public.pool_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.deals enable row level security;
alter table public.deal_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.pool_reports enable row level security;
alter table public.produce_listings enable row level security;

-- Drop existing policies cleanly so functions can be replaced safely
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "private_contacts_select_authorized" on public.profile_private_contacts;
drop policy if exists "private_contacts_insert_own" on public.profile_private_contacts;
drop policy if exists "private_contacts_update_own" on public.profile_private_contacts;

drop policy if exists "vehicles_select_restricted" on public.vehicles;
drop policy if exists "vehicles_insert_own" on public.vehicles;
drop policy if exists "vehicles_update_own" on public.vehicles;

drop policy if exists "pools_select_visible" on public.pools;
drop policy if exists "pools_insert_owner" on public.pools;
drop policy if exists "pools_update_owner_or_admin" on public.pools;

drop policy if exists "pool_stops_select_all" on public.pool_stops;
drop policy if exists "pool_stops_select_visible" on public.pool_stops;
drop policy if exists "pool_stops_manage_owner" on public.pool_stops;
drop policy if exists "pool_stops_insert_owner" on public.pool_stops;
drop policy if exists "pool_stops_update_owner" on public.pool_stops;
drop policy if exists "pool_stops_delete_owner" on public.pool_stops;

drop policy if exists "pool_requests_select_participants" on public.pool_requests;
drop policy if exists "pool_requests_insert_requester" on public.pool_requests;
drop policy if exists "pool_requests_update_requester_cancel" on public.pool_requests;

drop policy if exists "conversations_select_participants" on public.conversations;
drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_participants" on public.messages;
drop policy if exists "messages_update_read_recipient" on public.messages;

drop policy if exists "deals_select_participants_or_admin" on public.deals;
drop policy if exists "deal_transactions_select_participants" on public.deal_transactions;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;

drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_insert_after_completed_deal" on public.reviews;

drop policy if exists "pool_reports_select_own_or_admin" on public.pool_reports;
drop policy if exists "pool_reports_insert_authenticated" on public.pool_reports;
drop policy if exists "pool_reports_update_admin" on public.pool_reports;

drop policy if exists "produce_listings_select_visible" on public.produce_listings;
drop policy if exists "produce_listings_manage_own" on public.produce_listings;
drop policy if exists "produce_listings_insert_own" on public.produce_listings;
drop policy if exists "produce_listings_update_own" on public.produce_listings;
drop policy if exists "produce_listings_delete_own" on public.produce_listings;

-- Drop legacy parameterized signatures if present
drop function if exists public.is_admin(uuid);
drop function if exists public.has_confirmed_deal_with(uuid, uuid);

-- Helper function: checks if current authenticated caller is an active admin (zero-arg prevents user enumeration)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
      and is_suspended = false
  );
$$;

-- Helper function: checks if current authenticated caller has an active non-suspended profile
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_suspended = false
  );
$$;

-- Helper function: checks if current authenticated caller has an active confirmed/in-transit/delivered deal with target_user_id
create or replace function public.has_confirmed_deal_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deals d
    where d.status in ('CONFIRMED', 'IN_TRANSIT', 'DELIVERED')
      and (
        (d.owner_id = auth.uid() and d.requester_id = target_user_id)
        or (d.requester_id = auth.uid() and d.owner_id = target_user_id)
      )
  );
$$;

-- Lock down helper function execution: never callable by anon or PUBLIC
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

revoke all on function public.has_confirmed_deal_with(uuid) from public, anon;
grant execute on function public.has_confirmed_deal_with(uuid) to authenticated;

-- Explicit least-privilege table grants for anon and authenticated roles
revoke all on all tables in schema public from anon, authenticated;

-- Public-discovery read access for anon (no private tables)
grant select on public.profiles to anon;
grant select on public.pools to anon;
grant select on public.pool_stops to anon;
grant select on public.reviews to anon;
grant select on public.produce_listings to anon;

-- Scoped operational access for authenticated users (enforced further by RLS + triggers)
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profile_private_contacts to authenticated;
grant select, insert, update on public.vehicles to authenticated;
grant select, insert, update on public.pools to authenticated;
grant select, insert, update, delete on public.pool_stops to authenticated;
grant select, insert on public.pool_requests to authenticated;
grant update (status) on public.pool_requests to authenticated;
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant select on public.deals to authenticated;
grant select on public.deal_transactions to authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select, insert on public.reviews to authenticated;
grant select, insert, update on public.pool_reports to authenticated;
grant select, insert, update, delete on public.produce_listings to authenticated;

-- PROFILES: public-safe fields readable; non-recursive update policy (privileged fields protected by trigger in 0003)
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and is_admin = false
    and is_suspended = false
    and verification_status = 'unverified'
  );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (
    (auth.uid() = id and public.is_active_member())
    or public.is_admin()
  )
  with check (
    auth.uid() = id
    or public.is_admin()
  );

-- PROFILE PRIVATE CONTACTS: strictly private to owner, admin, or confirmed deal counterparty
create policy "private_contacts_select_authorized"
  on public.profile_private_contacts for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
    or public.has_confirmed_deal_with(user_id)
  );

create policy "private_contacts_insert_own"
  on public.profile_private_contacts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "private_contacts_update_own"
  on public.profile_private_contacts for update
  to authenticated
  using (
    (auth.uid() = user_id and public.is_active_member())
    or public.is_admin()
  )
  with check (
    auth.uid() = user_id
    or public.is_admin()
  );

-- VEHICLES: registration numbers restricted to vehicle owner, admins, and confirmed deal partners
create policy "vehicles_select_restricted"
  on public.vehicles for select
  to authenticated
  using (
    auth.uid() = owner_id
    or public.is_admin()
    or exists (
      select 1
      from public.deals d
      join public.pools p on p.id = d.pool_id
      where p.vehicle_id = vehicles.id
        and d.status in ('CONFIRMED', 'IN_TRANSIT', 'DELIVERED')
        and (d.owner_id = auth.uid() or d.requester_id = auth.uid())
    )
  );

create policy "vehicles_insert_own"
  on public.vehicles for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and ownership_confirmed = true
    and public.is_active_member()
  );

create policy "vehicles_update_own"
  on public.vehicles for update
  to authenticated
  using (auth.uid() = owner_id and public.is_active_member())
  with check (auth.uid() = owner_id and ownership_confirmed = true);

-- POOLS: open/active pools visible for discovery; owner must own referenced vehicle; reserved_capacity_kg protected by trigger
create policy "pools_select_visible"
  on public.pools for select
  using (
    status in ('OPEN', 'FULL', 'COMPLETED')
    or auth.uid() = owner_id
    or public.is_admin()
  );

create policy "pools_insert_owner"
  on public.pools for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and ownership_confirmed = true
    and reserved_capacity_kg = 0
    and status = 'OPEN'
    and is_flagged = false
    and public.is_active_member()
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id
        and v.owner_id = auth.uid()
    )
  );

create policy "pools_update_owner_or_admin"
  on public.pools for update
  to authenticated
  using (
    (auth.uid() = owner_id and public.is_active_member())
    or public.is_admin()
  )
  with check (
    auth.uid() = owner_id
    or public.is_admin()
  );

-- POOL STOPS: visible alongside visible pools; editable by active pool owner
create policy "pool_stops_select_visible"
  on public.pool_stops for select
  using (
    exists (
      select 1 from public.pools p
      where p.id = pool_stops.pool_id
        and (
          p.status in ('OPEN', 'FULL', 'COMPLETED')
          or p.owner_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy "pool_stops_insert_owner"
  on public.pool_stops for insert
  to authenticated
  with check (
    public.is_active_member()
    and exists (
      select 1 from public.pools p
      where p.id = pool_stops.pool_id and p.owner_id = auth.uid()
    )
  );

create policy "pool_stops_update_owner"
  on public.pool_stops for update
  to authenticated
  using (
    public.is_active_member()
    and exists (
      select 1 from public.pools p
      where p.id = pool_stops.pool_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pools p
      where p.id = pool_stops.pool_id and p.owner_id = auth.uid()
    )
  );

create policy "pool_stops_delete_owner"
  on public.pool_stops for delete
  to authenticated
  using (
    public.is_active_member()
    and exists (
      select 1 from public.pools p
      where p.id = pool_stops.pool_id and p.owner_id = auth.uid()
    )
  );

-- POOL REQUESTS: visible only to requester, pool owner, and admins
create policy "pool_requests_select_participants"
  on public.pool_requests for select
  to authenticated
  using (
    auth.uid() = requester_id
    or auth.uid() = pool_owner_id
    or public.is_admin()
  );

create policy "pool_requests_insert_requester"
  on public.pool_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> pool_owner_id
    and status = 'PENDING'
    and owner_confirmed_terms = false
    and requester_confirmed_terms = false
    and agreed_capacity_kg is null
    and agreed_price is null
    and public.is_active_member()
    and exists (
      select 1 from public.pools p
      where p.id = pool_id
        and p.owner_id = pool_owner_id
        and p.status = 'OPEN'
        and p.available_capacity_kg >= required_capacity_kg
    )
  );

create policy "pool_requests_update_requester_cancel"
  on public.pool_requests for update
  to authenticated
  using (
    auth.uid() = requester_id
    and status in ('PENDING', 'ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING')
  )
  with check (
    auth.uid() = requester_id
    and status = 'CANCELLED'
  );

-- CONVERSATIONS: strictly private to owner and requester
create policy "conversations_select_participants"
  on public.conversations for select
  to authenticated
  using (auth.uid() = owner_id or auth.uid() = requester_id);

-- MESSAGES: strictly private to conversation participants (only read_at updatable by recipient)
create policy "messages_select_participants"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = auth.uid() or c.requester_id = auth.uid())
    )
  );

create policy "messages_insert_participants"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and message_type = 'text'
    and public.is_active_member()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = auth.uid() or c.requester_id = auth.uid())
    )
  );

create policy "messages_update_read_recipient"
  on public.messages for update
  to authenticated
  using (
    sender_id is not null
    and sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = auth.uid() or c.requester_id = auth.uid())
    )
  )
  with check (
    sender_id is not null
    and sender_id <> auth.uid()
  );

-- DEALS: private to participants and admins (mutations go through transactional RPCs)
create policy "deals_select_participants_or_admin"
  on public.deals for select
  to authenticated
  using (
    auth.uid() = owner_id
    or auth.uid() = requester_id
    or public.is_admin()
  );

-- DEAL TRANSACTIONS: private to deal participants and admins
create policy "deal_transactions_select_participants"
  on public.deal_transactions for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.deals d
      where d.id = deal_transactions.deal_id
        and (d.owner_id = auth.uid() or d.requester_id = auth.uid())
    )
  );

-- NOTIFICATIONS: private to recipient (only is_read updatable)
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- REVIEWS: public read for trust display; insert only by confirmed-delivered deal participant
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

create policy "reviews_insert_after_completed_deal"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewee_id
    and public.is_active_member()
    and exists (
      select 1 from public.deals d
      where d.id = reviews.deal_id
        and d.status = 'DELIVERED'
        and (
          (d.owner_id = auth.uid() and d.requester_id = reviewee_id)
          or (d.requester_id = auth.uid() and d.owner_id = reviewee_id)
        )
    )
  );

-- POOL REPORTS: visible to reporter and admin
create policy "pool_reports_select_own_or_admin"
  on public.pool_reports for select
  to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

create policy "pool_reports_insert_authenticated"
  on public.pool_reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and status = 'OPEN'
    and resolved_by is null
    and public.is_active_member()
  );

create policy "pool_reports_update_admin"
  on public.pool_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PRODUCE LISTINGS: visible publicly when active; owned by active seller
create policy "produce_listings_select_visible"
  on public.produce_listings for select
  using (status = 'ACTIVE' or auth.uid() = seller_id or public.is_admin());

create policy "produce_listings_insert_own"
  on public.produce_listings for insert
  to authenticated
  with check (auth.uid() = seller_id and public.is_active_member());

create policy "produce_listings_update_own"
  on public.produce_listings for update
  to authenticated
  using (auth.uid() = seller_id and public.is_active_member())
  with check (auth.uid() = seller_id);

create policy "produce_listings_delete_own"
  on public.produce_listings for delete
  to authenticated
  using (auth.uid() = seller_id and public.is_active_member());
