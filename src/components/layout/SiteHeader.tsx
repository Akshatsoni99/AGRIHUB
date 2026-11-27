"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import { AgrihubLogo } from "@/components/brand/AgrihubLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicProfile } from "@/types/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SiteHeaderProps {
  user: { id: string; email?: string } | null;
  profile: PublicProfile | null;
  initialUnreadCount?: number;
}

export function SiteHeader({
  user,
  profile,
  initialUnreadCount = 0,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number | null>(null);
  const unreadCount = liveUnreadCount ?? initialUnreadCount;

  useEffect(() => {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`header-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setLiveUnreadCount((prev) => (prev ?? initialUnreadCount) + 1);
          const item = payload.new as { title?: string; body?: string };
          if (item?.title) {
            toast.info(item.title, { description: item.body });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          if (typeof count === "number") {
            setLiveUnreadCount(count);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, initialUnreadCount]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/truck-pool", label: "Truck Pool" },
    { href: "/marketplace", label: "For Businesses" },
  ];

  const appLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/truck-pool", label: "Truck Pool", icon: Truck },
    { href: "/my-pools", label: "My Pools", icon: PlusCircle },
    { href: "/my-requests", label: "My Requests", icon: Search },
    { href: "/my-deals", label: "My Deals", icon: ShieldCheck },
    { href: "/messages", label: "Messages", icon: MessageSquare },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4E8E2] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="shrink-0">
            <AgrihubLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {(user ? appLinks : publicLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive(link.href)
                    ? "bg-[#173D32]/10 text-[#173D32] font-semibold"
                    : "text-[#242B31] hover:bg-[#F4F5F1] hover:text-[#173D32]",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user && profile?.is_admin && (
              <Link
                href="/admin"
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive("/admin")
                    ? "bg-[#D5A45B]/20 text-[#173D32] font-semibold"
                    : "text-[#718078] hover:bg-[#F4F5F1] hover:text-[#173D32]",
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop Right Actions */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {user ? (
            <>
              <Link
                href="/truck-pool/find"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#242B31] transition hover:bg-[#F4F5F1]"
              >
                <Search className="h-3.5 w-3.5 text-[#173D32]" />
                Find Pool
              </Link>
              <Link
                href="/truck-pool/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#244638]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Create Pool
              </Link>
              <Link
                href="/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E8E2] bg-white text-[#242B31] transition hover:bg-[#F4F5F1]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B83B3B] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-1.5 text-xs font-semibold text-[#242B31] transition hover:border-[#173D32]/30"
              >
                <User className="h-3.5 w-3.5 text-[#173D32]" />
                <span className="max-w-[110px] truncate">
                  {profile?.full_name || "Profile"}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#718078] transition hover:bg-[#F4F5F1] hover:text-[#B83B3B]"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#242B31] transition hover:bg-[#F4F5F1]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#173D32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#244638]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && (
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E8E2] bg-white text-[#242B31]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B83B3B] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E8E2] bg-white text-[#242B31]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#E4E8E2] bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {(user ? appLinks : publicLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(link.href)
                    ? "bg-[#173D32]/10 text-[#173D32] font-semibold"
                    : "text-[#242B31] hover:bg-[#F4F5F1]",
                )}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  href="/marketplace"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#242B31] hover:bg-[#F4F5F1]"
                >
                  Produce Demand Board
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#242B31] hover:bg-[#F4F5F1]"
                >
                  Profile & Trust
                </Link>
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#242B31] hover:bg-[#F4F5F1]"
                  >
                    Admin Panel
                  </Link>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E4E8E2] pt-3">
                  <Link
                    href="/truck-pool/find"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E4E8E2] py-2 text-xs font-semibold text-[#242B31]"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Find Pool
                  </Link>
                  <Link
                    href="/truck-pool/create"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-[#173D32] py-2 text-xs font-semibold text-white"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Create Pool
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#B83B3B]/30 py-2 text-xs font-semibold text-[#B83B3B]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E4E8E2] pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-lg border border-[#E4E8E2] py-2.5 text-sm font-semibold text-[#242B31]"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-[#173D32] py-2.5 text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

