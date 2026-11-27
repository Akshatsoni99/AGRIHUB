# AGRIHUB Supabase Database Setup & Migrations

This directory contains the PostgreSQL schema, Row Level Security (RLS) policies, and transactional RPC functions required for AGRIHUB.

## Migration Files

1. `migrations/0001_schema.sql` — Core tables (`profiles`, `profile_private_contacts`, `vehicles`, `pools`, `pool_stops`, `pool_requests`, `conversations`, `messages`, `deals`, `deal_transactions`, `notifications`, `reviews`, `pool_reports`, `produce_listings`), generated capacity invariants, check constraints, and indexes.
2. `migrations/0002_rls_policies.sql` — Enables RLS across all tables with strict participant/owner/admin scoping, preventing exposure of mobile numbers, vehicle registration plates, and private chats.
3. `migrations/0003_functions_and_rpcs.sql` — Auth signup/verification triggers (`handle_new_user`, `handle_user_email_confirmed`), privileged column & capacity tamper guards, notification triggers, strict function `EXECUTE` permissions, and atomic transactional RPCs (`accept_pool_request`, `reject_pool_request`, `propose_deal_terms`, `confirm_deal_terms`, `cancel_confirmed_deal`, `update_deal_shipment_status`).
4. `migrations/0004_realtime.sql` — Sets `REPLICA IDENTITY FULL` on `notifications` and `pool_requests` and adds `messages`, `notifications`, and `pool_requests` to `supabase_realtime`.

## Applying Migrations in a New Supabase Project

### Option A: Using Supabase CLI (Recommended)

1. Install the Supabase CLI and log in:
   ```bash
   npx supabase login
   ```
2. Link your Supabase project:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
3. Push migrations:
   ```bash
   npx supabase db push
   ```

### Option B: Using Supabase SQL Editor

1. Open your Supabase Dashboard -> **SQL Editor**.
2. Execute `0001_schema.sql` first.
3. Execute `0002_rls_policies.sql` second.
4. Execute `0003_functions_and_rpcs.sql` third.
5. Execute `0004_realtime.sql` fourth.

## Enabling Realtime

Migration `0004_realtime.sql` automatically configures `REPLICA IDENTITY FULL` (for filtered `UPDATE` subscriptions) and adds `public.messages`, `public.notifications`, and `public.pool_requests` to `supabase_realtime` when `supabase_realtime` is not already `FOR ALL TABLES`.

## Granting Admin Role Securely

By default, all newly registered users have `is_admin = false`. There is no hardcoded admin password.
To promote a specific trusted operator account to admin, run this in the Supabase SQL Editor using your project's service privileges:

```sql
update public.profiles
set is_admin = true
where id = '<user-uuid-from-auth-users>';
```

