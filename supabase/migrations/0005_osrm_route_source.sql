-- AGRIHUB Migration 0005: Allow 'osrm' as a route_source on pools (preserving existing rows and constraints)

alter table public.pools
  drop constraint if exists pools_route_source_check;

alter table public.pools
  add constraint pools_route_source_check
  check (route_source in ('osrm', 'google_routes', 'manual'));

