# AGRIHUB — Trade Smart. Transport Together.

**AGRIHUB** is a shared truck capacity pooling and rural business logistics platform built to solve high freight costs, poor transport access, and underutilised vehicle capacity in semi-urban and rural corridors.

## Core Innovation: Shared Truck Capacity Pooling

1. Transporters or authorised operators publish unused cargo space, vehicle category, planned route, and intermediate stops.
2. Small producers and businesses discover compatible vehicles via the **Smart Route & Capacity Matching Engine**.
3. Shippers submit join requests with required kg weight, pickup/drop points, and proposed contribution (without prematurely locking space).
4. Accepted requests open a **private real-time Supabase Realtime negotiation chat**.
5. Both parties agree on terms and explicitly confirm the exact same final deal version.
6. A server-side **PostgreSQL transactional RPC (`confirm_deal_terms`)** locks the pool row (`FOR UPDATE`), verifies remaining capacity, reserves the agreed capacity atomically, updates pool status, and unlocks direct contact details.

## Technology Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (`Manrope` + `Inter`, Forest Green `#173D32`, Warm Ivory `#F4F5F1`, Muted Amber `#D5A45B`)
- **Database, Auth & Realtime**: Supabase PostgreSQL, `@supabase/ssr`, `@supabase/supabase-js`, Row Level Security (RLS), Supabase Realtime
- **Maps & Road Routing (100% Free, Zero API Keys)**: OpenStreetMap tiles, Leaflet + React Leaflet (`ssr: false`), OpenStreetMap Nominatim geocoding (debounced & cached), and OSRM public driving route server (`overview=full&geometries=geojson&steps=false`)
- **Validation & UI**: Zod, Lucide React, Custom Indian Cargo Vehicle SVG Illustrations, Sonner, date-fns
- **Testing**: Vitest

## Folder Structure

```text
├── src/
│   ├── app/
│   │   ├── admin/                  # Protected admin & moderation panel
│   │   ├── api/geocode/            # Debounced/cached Nominatim forward & reverse proxy
│   │   ├── api/routes/compute/     # Cached OSRM road-routing endpoint (lng,lat GeoJSON)
│   │   ├── auth/callback/          # Supabase PKCE auth callback
│   │   ├── dashboard/              # Authenticated live metrics dashboard
│   │   ├── forgot-password/        # Password reset request flow
│   │   ├── login/                  # Sign-in page
│   │   ├── marketplace/            # Supporting produce shipment demand board
│   │   ├── messages/               # Real-time private negotiation chat & deal confirmation
│   │   ├── my-deals/               # Confirmed deals, unlocked contacts, cancellations & reviews
│   │   ├── my-pools/               # Manage published pools & incoming requests
│   │   ├── my-requests/            # Track outgoing join requests
│   │   ├── notifications/          # Real-time activity notifications
│   │   ├── onboarding/             # Profile & role setup
│   │   ├── pools/[id]/             # Pool details, OSRM route map, join request & owner actions
│   │   ├── profile/                # Profile editor & public profile [id] with reviews
│   │   ├── reset-password/         # Set new password flow
│   │   ├── signup/                 # Registration with role selection
│   │   └── truck-pool/             # Truck Pool Hub, Create Pool, and Find Pool (List & Map)
│   ├── components/                 # Modular UI, custom vehicle SVGs, Leaflet maps, pools, chat, deals
│   ├── lib/
│   │   ├── capacity/               # Capacity calculation helpers & unit tests
│   │   ├── constants/              # Vehicle category specs & cargo/pricing constants
│   │   ├── maps/                   # Polyline5/GeoJSON encoding & coordinate helpers + unit tests
│   │   ├── matching/               # Smart Route & Capacity Matching Engine & unit tests
│   │   ├── supabase/               # SSR browser/server/middleware clients & auth helpers
│   │   └── validators/             # Zod validation schemas
│   ├── proxy.ts                    # Next.js 16 session refresh & protected route guard
│   └── types/                      # Strict TypeScript domain models
├── supabase/
│   ├── migrations/                 # Numbered PostgreSQL schema, RLS, RPCs, Realtime & OSRM constraint
│   └── README.md                   # Migration & admin promotion guide
├── .env.example                    # Required Supabase environment variables template
└── vitest.config.ts                # Unit test configuration
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials (never commit `.env.local`):

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase Publishable (anon) key used with RLS |

> **No Map API Keys Required**: AGRIHUB uses OpenStreetMap tiles, Nominatim geocoding, and OSRM routing with zero paid keys or billing setup.

### 3. Supabase Setup & Database Migrations

1. Create a new project in Supabase.
2. Apply the SQL migrations in order from `supabase/migrations/`:
   - `0001_schema.sql`
   - `0002_rls_policies.sql`
   - `0003_functions_and_rpcs.sql`
   - `0004_realtime.sql`
   - `0005_osrm_route_source.sql` (adds `'osrm'` to `pools.route_source` check constraint; safe & additive)
3. See [`supabase/README.md`](supabase/README.md) for CLI push commands and instructions to grant admin access to a trusted account.

### 4. Local Execution & Verification

```bash
# Development server
npm run dev

# TypeScript strict check
npm run typecheck

# ESLint check
npm run lint

# Automated matching, capacity & routing unit tests
npm test

# Production build
npm run build
```

## Deployment (Vercel)

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel Project Settings.
4. Add your production Vercel domain to Supabase Auth **Redirect URLs** (`https://your-domain.vercel.app/auth/callback`).
5. Deploy.

## Implemented Features

- Five cargo-only vehicle categories (`Cargo Auto`, `E-Cargo Auto`, `Pickup Truck`, `Loading Van`, `Heavy Truck`) with distinct custom Indian commercial vehicle vector illustrations and realistic capacity range validation.
- Multi-section **Create Pool** workflow with `Available = Total - Occupied` validation, debounced Nominatim search + interactive OpenStreetMap pin picker, intermediate stops, automatic OSRM road route calculation (distance, duration, and road polyline), and pre-publish preview.
- **Find Pool** discovery with **List View** and **Interactive Map View** (synchronized markers/cards, lazy OSRM route loading, and honest handling of unmapped listings), 9 filter dimensions, 4 sort modes, and transparent 9-criterion **Smart Route & Capacity Matching Engine**.
- **Request-to-Join** workflow (`PENDING -> ACCEPTED_FOR_DISCUSSION -> NEGOTIATING -> CONFIRMED / REJECTED / CANCELLED`) without premature capacity locks.
- **Real-time private chat** powered by PostgreSQL + Supabase Realtime + strict participant RLS.
- **Atomic mutual deal confirmation** (`confirm_deal_terms`) and single-release cancellation (`cancel_confirmed_deal`) with row-level locking (`FOR UPDATE`) and `deal_transactions` audit trail.
- **Privacy protection**: Private mobile numbers and vehicle registration numbers are never exposed on public listings and unlock only for confirmed deal partners.
- **Deal-gated reviews**, real-time **in-app notifications**, supporting **Produce Demand Board**, and **RLS-protected Admin Moderation Panel**.

## Free Public Mapping & Routing Limitations

- **OpenStreetMap Tile Servers** (`tile.openstreetmap.org`): Provided under the [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) with proper attribution. Heavy commercial production deployments should use a self-hosted or dedicated tile provider.
- **OSRM Public Demo Server** (`router.project-osrm.org`): Provided for light demonstration/prototype usage per the [OSRM API Usage Policy](https://router.project-osrm.org/). AGRIHUB caches route calculations on the server and lazily fetches Find Pool routes only when selected. For heavy production traffic, deploy a dedicated OSRM instance.
- **Nominatim Public Geocoding** (`nominatim.openstreetmap.org`): Debounced (`550ms`), minimum 3-character query length, cached (`15 min`), and rate-throttled (`>=1 req/sec`). If unavailable, users can always place coordinates directly using the interactive Leaflet map picker.
