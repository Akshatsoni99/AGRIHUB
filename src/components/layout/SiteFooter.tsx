import React from "react";
import Link from "next/link";
import { AgrihubLogo } from "@/components/brand/AgrihubLogo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#E4E8E2] bg-[#173D32] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <AgrihubLogo inverted size="md" />
            <p className="max-w-md text-sm leading-relaxed text-white/80">
              Trade Smart. Transport Together. A shared truck capacity pooling
              network connecting rural producers, small agribusinesses, and
              commercial transporters across semi-urban corridors.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D5A45B]">
              Truck Pool Network
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <Link href="/truck-pool" className="hover:text-white">
                  Truck Pool Hub
                </Link>
              </li>
              <li>
                <Link href="/truck-pool/find" className="hover:text-white">
                  Find Available Capacity
                </Link>
              </li>
              <li>
                <Link href="/truck-pool/create" className="hover:text-white">
                  Create a Vehicle Pool
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-white">
                  Produce Demand Board
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D5A45B]">
              Platform & Trust
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <Link href="/#how-it-works" className="hover:text-white">
                  How Pooling Works
                </Link>
              </li>
              <li>
                <Link href="/#vehicle-categories" className="hover:text-white">
                  Supported Vehicles
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Member Login
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:items-center">
          <p>AGRIHUB — Rural & Semi-Urban Shared Freight Coordination Platform</p>
          <p>Contact details remain private until both parties confirm a deal.</p>
        </div>
      </div>
    </footer>
  );
}

