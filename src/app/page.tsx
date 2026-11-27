import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Handshake,
  Lock,
  MessageSquare,
  PlusCircle,
  Route,
  Search,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroRouteIllustration } from "@/components/landing/HeroRouteIllustration";
import { VehicleIcon } from "@/components/ui/VehicleIcon";
import { VEHICLE_CATEGORIES } from "@/lib/constants/vehicles";

export default function LandingPage() {
  return (
    <AppShell>
      {/* Hero Section */}
      <section className="border-b border-[#E4E8E2] bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E8E2] bg-[#F4F5F1] px-3.5 py-1.5 text-xs font-semibold text-[#173D32]">
              <Route className="h-3.5 w-3.5 text-[#D5A45B]" />
              <span>Shared Truck Capacity Pooling for Rural & Semi-Urban Trade</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#173D32] sm:text-4xl lg:text-5xl lg:leading-[1.12]">
              Don&apos;t Move Half-Empty. Move Together.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#718078] sm:text-lg">
              Connect with available transport capacity, find compatible shipments
              and coordinate affordable goods transportation through one shared
              logistics network.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link
                href="/truck-pool/find"
                className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#244638]"
              >
                <Search className="h-4 w-4" />
                Find a Pool
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/truck-pool/create"
                className="inline-flex items-center gap-2 rounded-lg border border-[#173D32] bg-white px-6 py-3 text-sm font-semibold text-[#173D32] transition hover:bg-[#F4F5F1]"
              >
                <PlusCircle className="h-4 w-4" />
                Create a Pool
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 text-xs text-[#242B31] sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>Route & capacity matching</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>Private real-time negotiation</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>Atomic space reservation</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <HeroRouteIllustration />
          </div>
        </div>
      </section>

      {/* How AGRIHUB Works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1F6B48]">
            How AGRIHUB Works
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#173D32] sm:text-3xl">
            From unused vehicle space to confirmed shared shipment
          </h2>
          <p className="mt-2 text-sm text-[#718078]">
            Built around real semi-urban transport coordination: publish unused
            cargo space, match overlapping routes, negotiate privately, and lock
            capacity only when both parties confirm.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            {
              step: "01",
              icon: Truck,
              title: "Publish Unused Capacity",
              body: "Transporters or vehicle operators post their route, intermediate stops, departure window, and remaining kg space.",
            },
            {
              step: "02",
              icon: Compass,
              title: "Smart Route & Load Match",
              body: "Producers and small businesses search corridors. AGRIHUB scores pickup proximity, route direction, cargo fit, and weight.",
            },
            {
              step: "03",
              icon: MessageSquare,
              title: "Request & Negotiate",
              body: "Shippers send a join request. When accepted for discussion, both parties agree on pickup, drop, and price in private chat.",
            },
            {
              step: "04",
              icon: Handshake,
              title: "Mutual Deal & Reservation",
              body: "Once both confirm identical terms, capacity is atomically reserved, remaining pool space updates, and contacts unlock.",
            },
          ].map((item) => (
            <div key={item.step} className="agri-card flex flex-col p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#173D32]/10 text-[#173D32]">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[#D5A45B]">{item.step}</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-[#242B31]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#718078]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Cargo Vehicle Categories */}
      <section id="vehicle-categories" className="border-y border-[#E4E8E2] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1F6B48]">
                Cargo-Only Fleet Categories
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#173D32] sm:text-3xl">
                Five purpose-built cargo vehicle classes
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#718078]">
                Every listing validates declared carrying capacity against realistic
                category ranges so shippers can plan with confidence.
              </p>
            </div>
            <Link
              href="/truck-pool/find"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#173D32] hover:text-[#244638]"
            >
              Browse by vehicle type
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {VEHICLE_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/truck-pool/find?vehicle=${cat.id}`}
                className="agri-card group flex flex-col justify-between p-5 transition hover:border-[#173D32]/40"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4F5F1] text-[#173D32] group-hover:bg-[#173D32] group-hover:text-white transition">
                    <VehicleIcon category={cat.id} className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3.5 text-base font-bold text-[#242B31]">
                    {cat.label}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#D5A45B]">
                    Typical: {cat.typicalRangeLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#718078]">
                    {cat.description}
                  </p>
                </div>
                <p className="mt-4 border-t border-[#E4E8E2] pt-3 text-[11px] font-medium text-[#242B31]">
                  {cat.idealFor}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for Small Producers & Transporters + Create vs Find */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="agri-card p-7">
            <div className="flex items-center gap-2.5 text-[#173D32]">
              <Sprout className="h-5 w-5 text-[#1F6B48]" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                For Small Producers & Businesses
              </span>
            </div>
            <h3 className="mt-3 text-xl font-bold text-[#242B31]">
              Ship smaller agricultural & trade lots without hiring a full truck
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#718078]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Discover vehicles already passing near your village cluster or town
                  mandi.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Request only the weight capacity you need—whether 150 kg of crates
                  or 2,000 kg of grain sacks.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Coordinate pickup points, handling rules, and fair contributions
                  directly before locking space.
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/truck-pool/find"
                className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244638]"
              >
                How to Find a Pool
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-4 py-2 text-sm font-semibold text-[#242B31] hover:bg-white"
              >
                Post Produce Demand
              </Link>
            </div>
          </div>

          <div className="agri-card p-7">
            <div className="flex items-center gap-2.5 text-[#173D32]">
              <Truck className="h-5 w-5 text-[#D5A45B]" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                For Vehicle Owners & Transporters
              </span>
            </div>
            <h3 className="mt-3 text-xl font-bold text-[#242B31]">
              Turn unused cargo bed space & return trips into reliable revenue
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#718078]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Publish remaining capacity in minutes with intermediate stops along
                  your planned highway or rural corridor.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Review shipper cargo type, weight, and proposed contribution before
                  opening a private chat.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6B48]" />
                <span>
                  Prevent double-booking with server-enforced transactional capacity
                  locks on mutual confirmation.
                </span>
              </li>
            </ul>
            <div className="mt-6">
              <Link
                href="/truck-pool/create"
                className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244638]"
              >
                Create a Vehicle Pool
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust and Transparency */}
      <section className="border-t border-[#E4E8E2] bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F1] text-[#173D32]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#242B31]">
                  Private Contact Protection
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#718078]">
                  Personal mobile numbers and vehicle registration plates are never
                  shown on public listings. They unlock only for confirmed deal
                  partners.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F1] text-[#173D32]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#242B31]">
                  Mutual Confirmation & Concurrency Safety
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#718078]">
                  Capacity is never reserved by a simple request. PostgreSQL row
                  locking enforces that two simultaneous confirmations cannot
                  overbook a vehicle.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F1] text-[#173D32]">
                <Handshake className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#242B31]">
                  Deal-Gated Reviews & Accountability
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#718078]">
                  Ratings and reviews are permitted strictly after a confirmed
                  shipment is marked delivered—never fabricated or self-submitted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

