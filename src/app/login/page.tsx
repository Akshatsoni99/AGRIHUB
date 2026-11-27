import React, { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";

export default async function LoginPage() {
  const ctx = await getCurrentUserContext();

  if (ctx.isConfigured && ctx.user) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        {!ctx.isConfigured ? (
          <SetupBanner title="Configure Supabase to Enable Login" />
        ) : (
          <div className="agri-card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#173D32]">
                Sign in to AGRIHUB
              </h1>
              <p className="mt-1.5 text-sm text-[#718078]">
                Manage your vehicle pools, shipment requests, and negotiation chats.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="h-48 animate-pulse rounded-lg bg-[#F4F5F1]" />
              }
            >
              <LoginForm />
            </Suspense>

            <p className="mt-6 border-t border-[#E4E8E2] pt-4 text-center text-xs text-[#718078]">
              New to AGRIHUB?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#173D32] hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

