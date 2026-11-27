"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, PlusCircle, Search, Truck } from "lucide-react";
import { VehicleCategorySelector } from "@/components/pools/VehicleCategorySelector";
import type { VehicleCategory } from "@/types/domain";

export function TruckPoolHubClient() {
  const [selectedCategory, setSelectedCategory] = useState<
    VehicleCategory | "all"
  >("pickup_truck");

  const createHref =
    selectedCategory === "all"
      ? "/truck-pool/create"
      : `/truck-pool/create?vehicle=${selectedCategory}`;
  const findHref =
    selectedCategory === "all"
      ? "/truck-pool/find"
      : `/truck-pool/find?vehicle=${selectedCategory}`;

  return (
    <div className="space-y-8">
      {/* Top Hero Action Bar */}
      <div className="agri-card p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#173D32]/10 px-3 py-1 text-xs font-semibold text-[#173D32]">
              <Truck className="h-3.5 w-3.5" />
              <span>Shared Truck Capacity Pooling</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-[#173D32] sm:text-3xl">
              Truck Pool Coordination Hub
            </h1>
            <p className="mt-2 text-sm text-[#718078]">
              Select your cargo vehicle class below, then publish spare vehicle
              capacity or discover compatible open pools along your corridor. Your
              selected vehicle category carries directly into both workflows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={createHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#173D32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#244638]"
            >
              <PlusCircle className="h-4 w-4" />
              CREATE POOL
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={findHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#173D32] bg-white px-5 py-3 text-sm font-semibold text-[#173D32] transition hover:bg-[#F4F5F1]"
            >
              <Search className="h-4 w-4" />
              FIND POOL
            </Link>
          </div>
        </div>
      </div>

      {/* Category Selection Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#242B31]">
              Choose Cargo Vehicle Category
            </h2>
            <p className="text-xs text-[#718078]">
              Only cargo-compatible freight vehicles are supported—passenger-only
              autos are excluded.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#173D32]">
            Selected: {selectedCategory.replace("_", " ")}
          </span>
        </div>

        <VehicleCategorySelector
          value={selectedCategory}
          onChange={setSelectedCategory}
          includeAllOption
        />
      </section>
    </div>
  );
}

