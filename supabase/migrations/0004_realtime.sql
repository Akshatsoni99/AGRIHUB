-- AGRIHUB Migration 0004: Enable Realtime Publication for Messaging, Notifications & Negotiation Sync

-- Ensure filtered UPDATE subscriptions (e.g. user_id on notifications, id on pool_requests) carry full row context
alter table public.notifications replica identity full;
alter table public.pool_requests replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
      and not puballtables
  ) then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'pool_requests'
    ) then
      alter publication supabase_realtime add table public.pool_requests;
    end if;
  end if;
end $$;
