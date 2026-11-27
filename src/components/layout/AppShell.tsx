import React from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getCurrentUserContext } from "@/lib/supabase/auth-helpers";

interface AppShellProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export async function AppShell({ children, hideFooter = false }: AppShellProps) {
  const ctx = await getCurrentUserContext();

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F1]">
      <SiteHeader
        user={ctx.user}
        profile={ctx.profile}
        initialUnreadCount={ctx.unreadNotifications}
      />
      <main className="flex-1">{children}</main>
      {!hideFooter && <SiteFooter />}
    </div>
  );
}

