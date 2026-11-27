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
- **Maps & Routing**: Google Maps JavaScript API, Places Autocomplete API, and server-side Google Routes API v2
- **Validation & UI**: Zod, Lucide React, Sonner, date-fns
- **Testing**: Vitest

## Folder Structure

```text
├── src/
│   ├── app/
│   │   ├── admin/                  # Protected admin & moderation panel
│   │   ├── api/routes/compute/     # Server-only Google Routes API v2 endpoint
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
│   │   ├── pools/[id]/             # Pool details, route map, join request & owner actions
│   │   ├── profile/                # Profile editor & public profile [id] with reviews
│   │   ├── reset-password/         # Set new password flow
│   │   ├── signup/                 # Registration with role selection
│   │   └── truck-pool/             # Truck Pool Hub, Create Pool, and Find Pool explorer
│   ├── components/                 # Modular UI, maps, pools, chat, deals, admin components
│   ├── lib/
│   │   ├── capacity/               # Capacity calculation helpers & unit tests
│   │   ├── constants/              # Vehicle category specs & cargo/pricing constants
│   │   ├── maps/                   # Google Maps JS loader
│   │   ├── matching/               # Smart Route & Capacity Matching Engine & unit tests
│   │   ├── supabase/               # SSR browser/server/middleware clients & auth helpers
│   │   └── validators/             # Zod validation schemas
│   ├── proxy.ts                    # Next.js 16 session refresh & protected route guard
│   └── types/                      # Strict TypeScript domain models
├── supabase/
│   ├── migrations/                 # Numbered PostgreSQL schema, RLS, RPCs & Realtime SQL
│   └── README.md                   # Migration & admin promotion guide
├── .env.example                    # Required environment variables template
└── vitest.config.ts                # Unit test configuration
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials (never commit `.env.local`):

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase Publishable (anon) key used with RLS |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public (Referrer-restricted) | Maps JavaScript API & Places Autocomplete |
| `GOOGLE_MAPS_ROUTES_API_KEY` | Server-only | Google Routes API v2 called exclusively from `/api/routes/compute` |

> **Graceful Degradation**: If Supabase keys are absent, the UI displays clear setup instructions instead of crashing. If Google Maps keys are absent, manual location input and manual text-fallback matching remain fully functional and clearly labelled.

### 3. Supabase Setup & Database Migrations

1. Create a new project in Supabase.
2. Apply all SQL migrations in order from `supabase/migrations/`:
   - `0001_schema.sql`
   - `0002_rls_policies.sql`
   - `0003_functions_and_rpcs.sql`
   - `0004_realtime.sql`
3. See [`supabase/README.md`](supabase/README.md) for CLI push commands and instructions to grant admin access to a trusted account.

### 4. Google Maps Platform Setup

1. Enable **Maps JavaScript API**, **Places API**, and **Routes API** in Google Cloud Console.
2. Create a browser key for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` restricted by HTTP referrers (`http://localhost:3000/*`, `https://your-domain.vercel.app/*`) and limited to Maps JS + Places APIs.
3. Create a server key for `GOOGLE_MAPS_ROUTES_API_KEY` restricted to Routes API (never prefix with `NEXT_PUBLIC_`).

### 5. Local Execution & Verification

```bash
# Development server
npm run dev

# TypeScript strict check
npm run typecheck

# ESLint check
npm run lint

# Automated matching & capacity unit tests
npm test

# Production build
npm run build
```

## Deployment (Vercel)

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. Add the four environment variables from `.env.example` in Vercel Project Settings.
4. Add your production Vercel domain to Supabase Auth **Redirect URLs** (`https://your-domain.vercel.app/auth/callback`) and Google Maps API browser referrer restrictions.
5. Deploy.

## Implemented Features

- Five cargo-only vehicle categories (`Cargo Auto`, `E-Cargo Auto`, `Pickup Truck`, `Loading Van`, `Heavy Truck`) with realistic capacity range validation.
- Multi-section **Create Pool** workflow with `Available = Total - Occupied` validation, intermediate stops, Google Routes calculation, and pre-publish preview.
- **Find Pool** discovery with 9 filter dimensions, 4 sort modes, responsive mobile drawer, and transparent 9-criterion **Smart Route & Capacity Matching Engine**.
- **Request-to-Join** workflow (`PENDING -> ACCEPTED_FOR_DISCUSSION -> NEGOTIATING -> CONFIRMED / REJECTED / CANCELLED`) without premature capacity locks.
- **Real-time private chat** powered by PostgreSQL + Supabase Realtime + strict participant RLS.
- **Atomic mutual deal confirmation** (`confirm_deal_terms`) and single-release cancellation (`cancel_confirmed_deal`) with row-level locking (`FOR UPDATE`) and `deal_transactions` audit trail.
- **Privacy protection**: Private mobile numbers and vehicle registration numbers are never exposed on public listings and unlock only for confirmed deal partners.
- **Deal-gated reviews**, real-time **in-app notifications**, supporting **Produce Demand Board**, and **RLS-protected Admin Moderation Panel**.

## Known Limitations

- Live end-to-end Supabase authentication, Realtime messaging, and Google Maps rendering require configuring valid `.env.local` credentials against a live Supabase project and Google Cloud billing-enabled project.
- Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_ROUTES_API_KEY`, route matching operates in explicitly labelled manual city/stop text fallback mode rather than geographic polyline corridor overlap.

