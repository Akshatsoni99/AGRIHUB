-- AGRIHUB Migration 0003: Auth Triggers, Security Guards, and Transactional Capacity RPCs

-- 1. Automatic profile creation on new Supabase Auth user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_account_type text;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'AGRIHUB Member');
  if char_length(v_full_name) < 2 then
    v_full_name := 'AGRIHUB Member';
  end if;

  v_account_type := coalesce(new.raw_user_meta_data ->> 'account_type', 'both');
  if v_account_type not in ('shipper', 'transporter', 'both') then
    v_account_type := 'both';
  end if;

  insert into public.profiles (
    id,
    full_name,
    business_name,
    city,
    state,
    account_type,
    verification_status,
    is_admin,
    is_suspended,
    onboarding_completed
  ) values (
    new.id,
    v_full_name,
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'city'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'state'), ''),
    v_account_type,
    case when new.email_confirmed_at is not null then 'email_verified' else 'unverified' end,
    false,
    false,
    false
  )
  on conflict (id) do nothing;

  insert into public.profile_private_contacts (
    user_id,
    email,
    mobile_number
  ) values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'mobile_number'), '')
  )
  on conflict (user_id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 1b. Sync email verification status automatically from auth.users (never client-editable)
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
      set verification_status = 'email_verified'
      where id = new.id;
  end if;

  if new.email is distinct from old.email then
    update public.profile_private_contacts
      set email = coalesce(new.email, '')
      where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- 1c. Protect privileged profile columns from self-escalation without recursive RLS queries
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow server/service-role SQL operations (auth.uid() is null) or active admins
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be modified';
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Only administrators can change admin privileges';
  end if;

  if new.is_suspended is distinct from old.is_suspended then
    raise exception 'Only administrators can change suspension status';
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Verification status is managed automatically by email confirmation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- 2. Prevent client-side direct tampering with reserved_capacity_kg and moderation/ownership fields on pools
create or replace function public.guard_pool_reserved_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('agrihub.bypass_capacity_guard', true) = 'on' then
    return new;
  end if;

  if new.reserved_capacity_kg is distinct from old.reserved_capacity_kg then
    raise exception 'reserved_capacity_kg can only be changed through deal confirmation or cancellation transactions';
  end if;

  if new.total_capacity_kg < new.existing_occupied_kg + new.reserved_capacity_kg then
    raise exception 'Total capacity cannot be reduced below occupied plus reserved capacity';
  end if;

  if auth.uid() is not null and not public.is_admin() then
    if new.owner_id is distinct from old.owner_id
       or new.vehicle_id is distinct from old.vehicle_id
       or new.pool_code is distinct from old.pool_code
       or new.ownership_confirmed is distinct from old.ownership_confirmed then
      raise exception 'Pool ownership and vehicle references cannot be reassigned';
    end if;

    if new.is_flagged is distinct from old.is_flagged
       or new.moderation_note is distinct from old.moderation_note then
      raise exception 'Moderation flags can only be changed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_pool_reserved_capacity on public.pools;
create trigger trg_guard_pool_reserved_capacity
  before update on public.pools
  for each row execute function public.guard_pool_reserved_capacity();

-- 3. Notify pool owner when a new pool request is submitted
create or replace function public.notify_on_new_pool_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_code text;
begin
  select pool_code into v_pool_code from public.pools where id = new.pool_id;

  insert into public.notifications (
    user_id, type, title, body, link, related_pool_id, related_request_id
  ) values (
    new.pool_owner_id,
    'NEW_POOL_REQUEST',
    'New Join Request Received',
    format('A shipper requested %s kg on pool %s (%s to %s).', new.required_capacity_kg, coalesce(v_pool_code, ''), new.pickup_location, new.drop_location),
    format('/pools/%s', new.pool_id),
    new.pool_id,
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_new_pool_request on public.pool_requests;
create trigger trg_notify_new_pool_request
  after insert on public.pool_requests
  for each row execute function public.notify_on_new_pool_request();

-- 4. Update conversation last_message_at and notify recipient on new message
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations%rowtype;
  v_recipient uuid;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;

  if new.sender_id is not null and new.message_type = 'text' then
    v_recipient := case when new.sender_id = v_conv.owner_id then v_conv.requester_id else v_conv.owner_id end;
    insert into public.notifications (
      user_id, type, title, body, link, related_pool_id, related_request_id
    ) values (
      v_recipient,
      'NEW_MESSAGE',
      'New Negotiation Message',
      left(new.body, 140),
      format('/messages?conversation=%s', v_conv.id),
      v_conv.pool_id,
      v_conv.request_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_message on public.messages;
create trigger trg_handle_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- 5. RPC: Owner accepts a pending request for discussion & opens private chat
create or replace function public.accept_pool_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pool_requests%rowtype;
  v_pool public.pools%rowtype;
  v_conv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_active_member() then
    raise exception 'Account is suspended';
  end if;

  select * into v_req
  from public.pool_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pool request not found';
  end if;

  if v_req.pool_owner_id <> auth.uid() then
    raise exception 'Only the pool owner can accept this request for discussion';
  end if;

  if v_req.status <> 'PENDING' then
    raise exception 'Only PENDING requests can be accepted for discussion';
  end if;

  select * into v_pool from public.pools where id = v_req.pool_id;

  update public.pool_requests
  set
    status = 'ACCEPTED_FOR_DISCUSSION',
    agreed_capacity_kg = coalesce(agreed_capacity_kg, v_req.required_capacity_kg),
    agreed_price = coalesce(agreed_price, v_req.proposed_price),
    agreed_pickup_point = coalesce(agreed_pickup_point, v_req.pickup_location),
    agreed_drop_point = coalesce(agreed_drop_point, v_req.drop_location),
    agreed_departure_time = coalesce(agreed_departure_time, to_char(v_pool.departure_date, 'YYYY-MM-DD') || ' ' || left(v_pool.departure_time::text, 5)),
    agreed_conditions = coalesce(agreed_conditions, v_req.pricing_note)
  where id = p_request_id;

  insert into public.conversations (pool_id, request_id, owner_id, requester_id)
  values (v_req.pool_id, v_req.id, v_req.pool_owner_id, v_req.requester_id)
  on conflict (request_id) do update set last_message_at = now()
  returning id into v_conv_id;

  insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
  values (
    v_conv_id,
    null,
    'system',
    format('Request accepted for discussion (%s kg from %s to %s). Use this private thread to finalize pickup, drop, and contribution.', v_req.required_capacity_kg, v_req.pickup_location, v_req.drop_location),
    jsonb_build_object('event', 'ACCEPTED_FOR_DISCUSSION', 'request_id', v_req.id)
  );

  insert into public.notifications (
    user_id, type, title, body, link, related_pool_id, related_request_id
  ) values (
    v_req.requester_id,
    'REQUEST_ACCEPTED',
    'Pool Request Accepted for Discussion',
    format('The transporter opened a private negotiation chat for pool %s.', v_pool.pool_code),
    format('/messages?conversation=%s', v_conv_id),
    v_req.pool_id,
    v_req.id
  );

  return v_conv_id;
end;
$$;

-- 6. RPC: Owner rejects a request
create or replace function public.reject_pool_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pool_requests%rowtype;
  v_pool_code text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_req
  from public.pool_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pool request not found';
  end if;

  if v_req.pool_owner_id <> auth.uid() then
    raise exception 'Only the pool owner can reject this request';
  end if;

  if v_req.status not in ('PENDING', 'ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING') then
    raise exception 'Request cannot be rejected in its current state';
  end if;

  select pool_code into v_pool_code from public.pools where id = v_req.pool_id;

  update public.pool_requests
  set status = 'REJECTED',
      owner_confirmed_terms = false,
      requester_confirmed_terms = false
  where id = p_request_id;

  update public.messages
  set read_at = coalesce(read_at, now())
  where conversation_id in (select id from public.conversations where request_id = p_request_id);

  insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
  select id, null, 'system',
    case when nullif(trim(p_reason), '') is not null
      then format('Request was declined by the transporter: %s', trim(p_reason))
      else 'Request was declined by the transporter.'
    end,
    jsonb_build_object('event', 'REJECTED', 'request_id', v_req.id)
  from public.conversations where request_id = p_request_id;

  insert into public.notifications (
    user_id, type, title, body, link, related_pool_id, related_request_id
  ) values (
    v_req.requester_id,
    'REQUEST_REJECTED',
    'Pool Request Declined',
    format('Your request for pool %s was declined.', coalesce(v_pool_code, '')),
    '/my-requests',
    v_req.pool_id,
    v_req.id
  );
end;
$$;

-- 7. RPC: Propose updated final deal terms (resets mutual confirmations & increments terms_version)
create or replace function public.propose_deal_terms(
  p_request_id uuid,
  p_capacity_kg integer,
  p_price numeric,
  p_pickup_point text,
  p_drop_point text,
  p_departure_time text,
  p_conditions text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pool_requests%rowtype;
  v_pool public.pools%rowtype;
  v_conv_id uuid;
  v_next_version integer;
  v_is_owner boolean;
  v_other_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_active_member() then
    raise exception 'Account is suspended';
  end if;

  if p_capacity_kg is null or p_capacity_kg <= 0 then
    raise exception 'Proposed capacity must be greater than 0 kg';
  end if;

  if p_price is null or p_price < 0 then
    raise exception 'Proposed price cannot be negative';
  end if;

  if nullif(trim(p_pickup_point), '') is null or nullif(trim(p_drop_point), '') is null or nullif(trim(p_departure_time), '') is null then
    raise exception 'Pickup point, drop point, and departure time are required';
  end if;

  select * into v_req
  from public.pool_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pool request not found';
  end if;

  if auth.uid() <> v_req.pool_owner_id and auth.uid() <> v_req.requester_id then
    raise exception 'Only participants can propose deal terms';
  end if;

  if v_req.status not in ('ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING') then
    raise exception 'Terms can only be negotiated on accepted requests';
  end if;

  select * into v_pool from public.pools where id = v_req.pool_id;
  if v_pool.status <> 'OPEN' then
    raise exception 'Pool is no longer open for reservations';
  end if;

  if p_capacity_kg > v_pool.available_capacity_kg then
    raise exception 'Proposed capacity (% kg) exceeds available pool capacity (% kg)', p_capacity_kg, v_pool.available_capacity_kg;
  end if;

  v_is_owner := (auth.uid() = v_req.pool_owner_id);
  v_other_user := case when v_is_owner then v_req.requester_id else v_req.pool_owner_id end;
  v_next_version := v_req.terms_version + 1;

  update public.pool_requests
  set
    status = 'NEGOTIATING',
    agreed_capacity_kg = p_capacity_kg,
    agreed_price = p_price,
    agreed_pickup_point = trim(p_pickup_point),
    agreed_drop_point = trim(p_drop_point),
    agreed_departure_time = trim(p_departure_time),
    agreed_conditions = nullif(trim(p_conditions), ''),
    owner_confirmed_terms = v_is_owner,
    requester_confirmed_terms = not v_is_owner,
    terms_version = v_next_version
  where id = p_request_id;

  select id into v_conv_id from public.conversations where request_id = p_request_id;

  if v_conv_id is not null then
    insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
    values (
      v_conv_id,
      auth.uid(),
      'proposal',
      format('Proposed terms (v%s): %s kg • ₹%s • Pickup: %s → Drop: %s • Departure: %s', v_next_version, p_capacity_kg, p_price, trim(p_pickup_point), trim(p_drop_point), trim(p_departure_time)),
      jsonb_build_object(
        'terms_version', v_next_version,
        'agreed_capacity_kg', p_capacity_kg,
        'agreed_price', p_price,
        'agreed_pickup_point', trim(p_pickup_point),
        'agreed_drop_point', trim(p_drop_point),
        'agreed_departure_time', trim(p_departure_time),
        'agreed_conditions', nullif(trim(p_conditions), '')
      )
    );
  end if;

  insert into public.notifications (
    user_id, type, title, body, link, related_pool_id, related_request_id
  ) values (
    v_other_user,
    'NEW_PRICE_PROPOSAL',
    'Updated Deal Terms Proposed',
    format('New terms (v%s): %s kg for ₹%s on pool %s. Review and confirm in chat.', v_next_version, p_capacity_kg, p_price, v_pool.pool_code),
    case when v_conv_id is not null then format('/messages?conversation=%s', v_conv_id) else '/messages' end,
    v_req.pool_id,
    v_req.id
  );

  return v_next_version;
end;
$$;

-- 8. CRITICAL CONCURRENCY RPC: Mutual confirmation & atomic capacity reservation
create or replace function public.confirm_deal_terms(
  p_request_id uuid,
  p_expected_terms_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.pool_requests%rowtype;
  v_pool public.pools%rowtype;
  v_conv_id uuid;
  v_is_owner boolean;
  v_other_user uuid;
  v_owner_confirmed boolean;
  v_requester_confirmed boolean;
  v_agreed_capacity integer;
  v_agreed_price numeric;
  v_new_deal_id uuid;
  v_deal_code text;
  v_new_reserved integer;
  v_remaining_after integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_active_member() then
    raise exception 'Account is suspended';
  end if;

  -- Lock request row first, then pool row to prevent concurrent over-reservation
  select * into v_req
  from public.pool_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pool request not found';
  end if;

  if auth.uid() <> v_req.pool_owner_id and auth.uid() <> v_req.requester_id then
    raise exception 'Unauthorized to confirm terms for this request';
  end if;

  if v_req.status not in ('ACCEPTED_FOR_DISCUSSION', 'NEGOTIATING') then
    raise exception 'Request is in % state and cannot be confirmed', v_req.status;
  end if;

  if v_req.terms_version <> p_expected_terms_version then
    raise exception 'Terms were updated by the other party (current version v%). Please review the latest terms before confirming.', v_req.terms_version;
  end if;

  select * into v_pool
  from public.pools
  where id = v_req.pool_id
  for update;

  if not found then
    raise exception 'Associated pool not found';
  end if;

  v_agreed_capacity := coalesce(v_req.agreed_capacity_kg, v_req.required_capacity_kg);
  v_agreed_price := coalesce(v_req.agreed_price, v_req.proposed_price);

  if v_pool.status <> 'OPEN' then
    raise exception 'Pool % is currently % and cannot reserve capacity', v_pool.pool_code, v_pool.status;
  end if;

  if v_pool.available_capacity_kg < v_agreed_capacity then
    raise exception 'Insufficient capacity remaining in pool % (% kg available, % kg requested)', v_pool.pool_code, v_pool.available_capacity_kg, v_agreed_capacity;
  end if;

  v_is_owner := (auth.uid() = v_req.pool_owner_id);
  v_other_user := case when v_is_owner then v_req.requester_id else v_req.pool_owner_id end;
  v_owner_confirmed := v_req.owner_confirmed_terms or v_is_owner;
  v_requester_confirmed := v_req.requester_confirmed_terms or (not v_is_owner);

  select id into v_conv_id from public.conversations where request_id = p_request_id;

  -- If only one side has confirmed so far, record confirmation and notify counterparty
  if not (v_owner_confirmed and v_requester_confirmed) then
    update public.pool_requests
    set
      status = 'NEGOTIATING',
      agreed_capacity_kg = v_agreed_capacity,
      agreed_price = v_agreed_price,
      agreed_pickup_point = coalesce(v_req.agreed_pickup_point, v_req.pickup_location),
      agreed_drop_point = coalesce(v_req.agreed_drop_point, v_req.drop_location),
      owner_confirmed_terms = v_owner_confirmed,
      requester_confirmed_terms = v_requester_confirmed
    where id = p_request_id;

    if v_conv_id is not null then
      insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
      values (
        v_conv_id,
        null,
        'system',
        format('%s confirmed final terms v%s (%s kg, ₹%s). Waiting for the other party to confirm.', case when v_is_owner then 'Transporter' else 'Shipper' end, v_req.terms_version, v_agreed_capacity, v_agreed_price),
        jsonb_build_object('event', 'PARTIAL_CONFIRMATION', 'terms_version', v_req.terms_version)
      );
    end if;

    insert into public.notifications (
      user_id, type, title, body, link, related_pool_id, related_request_id
    ) values (
      v_other_user,
      'DEAL_CONFIRMATION_NEEDED',
      'Your Confirmation Needed',
      format('Counterparty confirmed terms for pool %s (%s kg, ₹%s). Confirm to lock capacity.', v_pool.pool_code, v_agreed_capacity, v_agreed_price),
      case when v_conv_id is not null then format('/messages?conversation=%s', v_conv_id) else '/messages' end,
      v_req.pool_id,
      v_req.id
    );

    return jsonb_build_object(
      'confirmed', false,
      'owner_confirmed', v_owner_confirmed,
      'requester_confirmed', v_requester_confirmed
    );
  end if;

  -- Both parties confirmed the exact same terms -> Atomic reservation!
  v_new_reserved := v_pool.reserved_capacity_kg + v_agreed_capacity;
  v_remaining_after := v_pool.total_capacity_kg - v_pool.existing_occupied_kg - v_new_reserved;

  if v_remaining_after < 0 then
    raise exception 'Concurrent reservation conflict: insufficient capacity left in pool %', v_pool.pool_code;
  end if;

  perform set_config('agrihub.bypass_capacity_guard', 'on', true);

  update public.pools
  set
    reserved_capacity_kg = v_new_reserved,
    status = case when v_remaining_after = 0 then 'FULL' else status end
  where id = v_pool.id;

  perform set_config('agrihub.bypass_capacity_guard', 'off', true);

  update public.pool_requests
  set
    status = 'CONFIRMED',
    agreed_capacity_kg = v_agreed_capacity,
    agreed_price = v_agreed_price,
    agreed_pickup_point = coalesce(v_req.agreed_pickup_point, v_req.pickup_location),
    agreed_drop_point = coalesce(v_req.agreed_drop_point, v_req.drop_location),
    owner_confirmed_terms = true,
    requester_confirmed_terms = true
  where id = p_request_id;

  v_deal_code := 'DEAL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.deals (
    deal_code, pool_id, request_id, conversation_id, owner_id, requester_id,
    agreed_capacity_kg, agreed_price, pickup_point, drop_point, departure_time, special_conditions, status
  ) values (
    v_deal_code,
    v_pool.id,
    v_req.id,
    v_conv_id,
    v_req.pool_owner_id,
    v_req.requester_id,
    v_agreed_capacity,
    v_agreed_price,
    coalesce(v_req.agreed_pickup_point, v_req.pickup_location),
    coalesce(v_req.agreed_drop_point, v_req.drop_location),
    coalesce(v_req.agreed_departure_time, to_char(v_pool.departure_date, 'YYYY-MM-DD') || ' ' || left(v_pool.departure_time::text, 5)),
    v_req.agreed_conditions,
    'CONFIRMED'
  )
  returning id into v_new_deal_id;

  insert into public.deal_transactions (deal_id, pool_id, actor_id, event_type, capacity_delta_kg, notes)
  values (
    v_new_deal_id,
    v_pool.id,
    auth.uid(),
    'DEAL_CONFIRMED',
    -v_agreed_capacity,
    format('Deal %s confirmed: %s kg reserved on pool %s.', v_deal_code, v_agreed_capacity, v_pool.pool_code)
  );

  if v_conv_id is not null then
    insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
    values (
      v_conv_id,
      null,
      'system',
      format('Deal %s CONFIRMED! %s kg reserved on pool %s (%s kg remaining). Direct contact details are now unlocked in My Deals.', v_deal_code, v_agreed_capacity, v_pool.pool_code, v_remaining_after),
      jsonb_build_object('event', 'DEAL_CONFIRMED', 'deal_id', v_new_deal_id, 'deal_code', v_deal_code)
    );
  end if;

  insert into public.notifications (user_id, type, title, body, link, related_pool_id, related_request_id, related_deal_id)
  values
    (
      v_req.pool_owner_id,
      'DEAL_CONFIRMED',
      'Deal Confirmed & Capacity Reserved',
      format('Deal %s confirmed for %s kg on pool %s (%s kg still open).', v_deal_code, v_agreed_capacity, v_pool.pool_code, v_remaining_after),
      '/my-deals',
      v_pool.id,
      v_req.id,
      v_new_deal_id
    ),
    (
      v_req.requester_id,
      'DEAL_CONFIRMED',
      'Deal Confirmed & Space Reserved',
      format('Deal %s confirmed! %s kg reserved on pool %s. View pickup details in My Deals.', v_deal_code, v_agreed_capacity, v_pool.pool_code),
      '/my-deals',
      v_pool.id,
      v_req.id,
      v_new_deal_id
    );

  return jsonb_build_object(
    'confirmed', true,
    'deal_id', v_new_deal_id,
    'deal_code', v_deal_code,
    'remaining_capacity_kg', v_remaining_after
  );
end;
$$;

-- 9. RPC: Cancel a confirmed deal and release capacity EXACTLY ONCE
create or replace function public.cancel_confirmed_deal(
  p_deal_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.deals%rowtype;
  v_pool public.pools%rowtype;
  v_new_reserved integer;
  v_new_available integer;
  v_other_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_deal
  from public.deals
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> v_deal.owner_id and auth.uid() <> v_deal.requester_id and not public.is_admin() then
    raise exception 'Unauthorized to cancel this deal';
  end if;

  if v_deal.status <> 'CONFIRMED' then
    raise exception 'Only CONFIRMED deals prior to dispatch can be cancelled (current status: %)', v_deal.status;
  end if;

  if v_deal.capacity_released then
    raise exception 'Capacity for this deal has already been released';
  end if;

  select * into v_pool
  from public.pools
  where id = v_deal.pool_id
  for update;

  v_new_reserved := greatest(0, v_pool.reserved_capacity_kg - v_deal.agreed_capacity_kg);
  v_new_available := v_pool.total_capacity_kg - v_pool.existing_occupied_kg - v_new_reserved;

  perform set_config('agrihub.bypass_capacity_guard', 'on', true);

  update public.pools
  set
    reserved_capacity_kg = v_new_reserved,
    status = case when status = 'FULL' and v_new_available > 0 then 'OPEN' else status end
  where id = v_pool.id;

  perform set_config('agrihub.bypass_capacity_guard', 'off', true);

  update public.deals
  set
    status = 'CANCELLED',
    capacity_released = true,
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = nullif(trim(p_reason), '')
  where id = p_deal_id;

  update public.pool_requests
  set status = 'CANCELLED'
  where id = v_deal.request_id;

  insert into public.deal_transactions (deal_id, pool_id, actor_id, event_type, capacity_delta_kg, notes)
  values (
    v_deal.id,
    v_pool.id,
    auth.uid(),
    'DEAL_CANCELLED',
    v_deal.agreed_capacity_kg,
    coalesce(nullif(trim(p_reason), ''), 'Confirmed deal cancelled; capacity released back to pool.')
  );

  if v_deal.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, message_type, body, metadata)
    values (
      v_deal.conversation_id,
      null,
      'system',
      format('Deal %s was cancelled. %s kg has been released back to pool %s.', v_deal.deal_code, v_deal.agreed_capacity_kg, v_pool.pool_code),
      jsonb_build_object('event', 'DEAL_CANCELLED', 'deal_id', v_deal.id)
    );
  end if;

  v_other_user := case when auth.uid() = v_deal.owner_id then v_deal.requester_id else v_deal.owner_id end;

  insert into public.notifications (user_id, type, title, body, link, related_pool_id, related_deal_id)
  values (
    v_other_user,
    'DEAL_CANCELLED',
    'Confirmed Deal Cancelled',
    format('Deal %s on pool %s was cancelled and %s kg capacity was released.', v_deal.deal_code, v_pool.pool_code, v_deal.agreed_capacity_kg),
    '/my-deals',
    v_pool.id,
    v_deal.id
  );

  return jsonb_build_object(
    'cancelled', true,
    'released_capacity_kg', v_deal.agreed_capacity_kg,
    'pool_available_capacity_kg', v_new_available
  );
end;
$$;

-- 10. RPC: Progress shipment status (CONFIRMED -> IN_TRANSIT -> DELIVERED)
create or replace function public.update_deal_shipment_status(
  p_deal_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.deals%rowtype;
  v_event text;
  v_other_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_active_member() then
    raise exception 'Account is suspended';
  end if;

  if p_new_status not in ('IN_TRANSIT', 'DELIVERED') then
    raise exception 'Invalid shipment status transition';
  end if;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> v_deal.owner_id and auth.uid() <> v_deal.requester_id then
    raise exception 'Only deal participants can update shipment status';
  end if;

  if p_new_status = 'IN_TRANSIT' and v_deal.status <> 'CONFIRMED' then
    raise exception 'Only CONFIRMED deals can be marked IN_TRANSIT';
  end if;

  if p_new_status = 'DELIVERED' and v_deal.status not in ('CONFIRMED', 'IN_TRANSIT') then
    raise exception 'Deal must be CONFIRMED or IN_TRANSIT before marking DELIVERED';
  end if;

  update public.deals set status = p_new_status where id = p_deal_id;

  v_event := case when p_new_status = 'IN_TRANSIT' then 'SHIPMENT_IN_TRANSIT' else 'SHIPMENT_DELIVERED' end;

  insert into public.deal_transactions (deal_id, pool_id, actor_id, event_type, capacity_delta_kg, notes)
  values (v_deal.id, v_deal.pool_id, auth.uid(), v_event, 0, format('Shipment marked %s.', p_new_status));

  v_other_user := case when auth.uid() = v_deal.owner_id then v_deal.requester_id else v_deal.owner_id end;
  insert into public.notifications (user_id, type, title, body, link, related_pool_id, related_deal_id)
  values (
    v_other_user,
    v_event,
    format('Shipment %s', replace(p_new_status, '_', ' ')),
    format('Deal %s status updated to %s.', v_deal.deal_code, replace(p_new_status, '_', ' ')),
    '/my-deals',
    v_deal.pool_id,
    v_deal.id
  );
end;
$$;

-- 11. Strict function EXECUTE permissions: revoke PUBLIC & anon everywhere, grant RPCs to authenticated only
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_confirmed() from public, anon, authenticated;
revoke all on function public.guard_profile_privileged_columns() from public, anon, authenticated;
revoke all on function public.guard_pool_reserved_capacity() from public, anon, authenticated;
revoke all on function public.notify_on_new_pool_request() from public, anon, authenticated;
revoke all on function public.handle_new_message() from public, anon, authenticated;

revoke all on function public.accept_pool_request(uuid) from public, anon;
grant execute on function public.accept_pool_request(uuid) to authenticated;

revoke all on function public.reject_pool_request(uuid, text) from public, anon;
grant execute on function public.reject_pool_request(uuid, text) to authenticated;

revoke all on function public.propose_deal_terms(uuid, integer, numeric, text, text, text, text) from public, anon;
grant execute on function public.propose_deal_terms(uuid, integer, numeric, text, text, text, text) to authenticated;

revoke all on function public.confirm_deal_terms(uuid, integer) from public, anon;
grant execute on function public.confirm_deal_terms(uuid, integer) to authenticated;

revoke all on function public.cancel_confirmed_deal(uuid, text) from public, anon;
grant execute on function public.cancel_confirmed_deal(uuid, text) to authenticated;

revoke all on function public.update_deal_shipment_status(uuid, text) from public, anon;
grant execute on function public.update_deal_shipment_status(uuid, text) to authenticated;
