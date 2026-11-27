import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { ProfileEditorForm } from "@/components/profile/ProfileEditorForm";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";

export default async function OnboardingPage() {
  const ctx = await getCurrentUserContext({ includePrivateContact: true });

  if (!ctx.isConfigured) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <SetupBanner />
        </div>
      </AppShell>
    );
  }

  if (!ctx.user) {
    redirect("/login?next=/onboarding");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="agri-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1F6B48]">
            Account Setup
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-[#173D32]">
            Complete your AGRIHUB profile
          </h1>
          <p className="mt-1.5 text-sm text-[#718078]">
            Confirm your location, business name, and whether you operate as a
            shipper, transporter, or both.
          </p>

          <div className="mt-6">
            <ProfileEditorForm
              userId={ctx.user.id}
              email={ctx.user.email || ctx.privateContact?.email || ""}
              profile={ctx.profile}
              privateContact={ctx.privateContact}
              redirectTo="/dashboard"
              submitLabel="Complete Onboarding"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

