import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { SignupForm } from "@/components/auth/SignupForm";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";

export default async function SignupPage() {
  const ctx = await getCurrentUserContext();

  if (ctx.isConfigured && ctx.user) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {!ctx.isConfigured ? (
          <SetupBanner title="Configure Supabase to Enable Registration" />
        ) : (
          <div className="agri-card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#173D32]">
                Join AGRIHUB Shared Logistics
              </h1>
              <p className="mt-1.5 text-sm text-[#718078]">
                Create your account as a shipper, transporter, or both to pool
                capacity across rural and semi-urban routes.
              </p>
            </div>

            <SignupForm />

            <p className="mt-6 border-t border-[#E4E8E2] pt-4 text-center text-xs text-[#718078]">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#173D32] hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

