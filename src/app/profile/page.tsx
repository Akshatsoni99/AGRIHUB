import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, CheckCircle2, MapPin, Shield, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { ProfileEditorForm } from "@/components/profile/ProfileEditorForm";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/utils";
import type { ReviewRecord } from "@/types/domain";

export default async function ProfilePage() {
  const ctx = await getCurrentUserContext({ includePrivateContact: true });

  if (!ctx.isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  if (!ctx.user) {
    redirect("/login?next=/profile");
  }

  const supabase = await createSupabaseServerClient();
  let completedDealsCount = 0;
  let reviews: ReviewRecord[] = [];

  if (supabase) {
    const [{ count: dealsCount }, { data: reviewRows }] = await Promise.all([
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("status", "DELIVERED")
        .or(`owner_id.eq.${ctx.user.id},requester_id.eq.${ctx.user.id}`),
      supabase
        .from("reviews")
        .select(
          "*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, business_name, city, state)",
        )
        .eq("reviewee_id", ctx.user.id)
        .order("created_at", { ascending: false }),
    ]);

    completedDealsCount = dealsCount ?? 0;
    reviews = (reviewRows as ReviewRecord[]) || [];
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#173D32]">
              Profile & Trust Settings
            </h1>
            <p className="mt-1 text-sm text-[#718078]">
              Manage your account role, private contact details, and view
              deal-verified ratings.
            </p>
          </div>
          <Link
            href={`/profile/${ctx.user.id}`}
            className="inline-flex items-center rounded-lg border border-[#E4E8E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#242B31] hover:bg-[#F4F5F1]"
          >
            View Public Profile
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Summary Card */}
          <div className="space-y-4">
            <div className="agri-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#242B31]">
                    {ctx.profile?.full_name || "AGRIHUB Member"}
                  </h2>
                  {ctx.profile?.business_name && (
                    <p className="text-xs font-medium text-[#718078]">
                      {ctx.profile.business_name}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-[#173D32]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-[#173D32]">
                  {ctx.profile?.account_type || "both"}
                </span>
              </div>

              <div className="mt-4 space-y-2 border-t border-[#E4E8E2] pt-4 text-xs text-[#718078]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#173D32]" />
                  <span>
                    {ctx.profile?.city && ctx.profile?.state
                      ? `${ctx.profile.city}, ${ctx.profile.state}`
                      : "Location not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#173D32]" />
                  <span>
                    Joined{" "}
                    {ctx.profile?.created_at
                      ? formatShortDate(ctx.profile.created_at)
                      : "Recently"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[#173D32]" />
                  <span>
                    Status:{" "}
                    {ctx.profile?.verification_status === "email_verified"
                      ? "Email Verified (Not Gov ID Verified)"
                      : "Standard Account"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#1F6B48]" />
                  <span>{completedDealsCount} completed deals</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-[#D5A45B]" />
                  <span>
                    {avgRating
                      ? `${avgRating} / 5 (${reviews.length} reviews)`
                      : "No ratings yet"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form & Reviews */}
          <div className="space-y-6 lg:col-span-2">
            <div className="agri-card p-6">
              <h2 className="mb-4 text-base font-bold text-[#242B31]">
                Edit Profile Details
              </h2>
              <ProfileEditorForm
                userId={ctx.user.id}
                email={ctx.user.email || ctx.privateContact?.email || ""}
                profile={ctx.profile}
                privateContact={ctx.privateContact}
              />
            </div>

            <div className="agri-card p-6">
              <h2 className="text-base font-bold text-[#242B31]">
                Reviews Received ({reviews.length})
              </h2>
              <p className="mt-1 text-xs text-[#718078]">
                Only participants who completed a confirmed delivery with you can
                submit a rating.
              </p>

              {reviews.length === 0 ? (
                <p className="mt-4 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-4 text-xs text-[#718078]">
                  No reviews yet. Complete a shared shipment deal to build
                  verified transaction feedback.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
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
      </div>
    </AppShell>
  );
}

