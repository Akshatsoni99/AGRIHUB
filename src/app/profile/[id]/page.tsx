import React from "react";
import { notFound } from "next/navigation";
import { Calendar, CheckCircle2, MapPin, Shield, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { formatShortDate } from "@/lib/utils";
import type { PublicProfile, ReviewRecord } from "@/types/domain";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    notFound();
  }

  const [{ data: profile }, { count: deliveredCount }, { data: reviewRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("status", "DELIVERED")
        .or(`owner_id.eq.${id},requester_id.eq.${id}`),
      supabase
        .from("reviews")
        .select(
          "*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, business_name, city, state)",
        )
        .eq("reviewee_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!profile) {
    notFound();
  }

  const typedProfile = profile as PublicProfile;
  const reviews = (reviewRows as ReviewRecord[]) || [];
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="agri-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E4E8E2] pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#173D32]">
                  {typedProfile.full_name}
                </h1>
                <span className="rounded-full bg-[#173D32]/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-[#173D32]">
                  {typedProfile.account_type}
                </span>
              </div>
              {typedProfile.business_name && (
                <p className="mt-1 text-sm font-medium text-[#242B31]">
                  {typedProfile.business_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#718078]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#173D32]" />
                  {typedProfile.city && typedProfile.state
                    ? `${typedProfile.city}, ${typedProfile.state}`
                    : "Regional Member"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#173D32]" />
                  Member since {formatShortDate(typedProfile.created_at)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#173D32]" />
                  {typedProfile.verification_status === "email_verified"
                    ? "Email Verified"
                    : "Standard Account"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-[#E4E8E2] bg-[#F4F5F1] px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#718078]">
                  Completed Deals
                </p>
                <p className="flex items-center gap-1.5 text-lg font-bold text-[#173D32]">
                  <CheckCircle2 className="h-4 w-4 text-[#1F6B48]" />
                  {deliveredCount ?? 0}
                </p>
              </div>
              <div className="h-8 w-px bg-[#E4E8E2]" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#718078]">
                  Rating
                </p>
                <p className="flex items-center gap-1 text-lg font-bold text-[#242B31]">
                  <Star className="h-4 w-4 fill-[#D5A45B] text-[#D5A45B]" />
                  {avgRating || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#718078]">
            Private contact numbers are hidden on public profiles and unlock only
            after both parties confirm a shared transport deal.
          </p>

          <div className="mt-6">
            <h2 className="text-base font-bold text-[#242B31]">
              Verified Deal Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-4 text-xs text-[#718078]">
                No reviews recorded yet for this member.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#242B31]">
                        {rev.reviewer?.full_name || "AGRIHUB Member"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A611E]">
                        <Star className="h-3.5 w-3.5 fill-[#D5A45B] text-[#D5A45B]" />
                        {rev.rating} / 5
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="mt-1.5 text-xs text-[#242B31]">
                        {rev.comment}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#718078]">
                      {formatShortDate(rev.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

