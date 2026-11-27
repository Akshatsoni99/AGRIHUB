"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/types/domain";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationsClientProps {
  userId: string;
  initialItems: NotificationItem[];
}

export function NotificationsClient({
  userId,
  initialItems,
}: NotificationsClientProps) {
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [markingAll, setMarkingAll] = useState(false);

  async function markOneRead(id: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }

  async function markAllRead() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setMarkingAll(true);
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#718078]">
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-white px-3 py-1.5 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="agri-card py-14 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-[#718078]" />
          <p className="text-sm font-semibold text-[#242B31]">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-xs text-[#718078]">
            Notifications for pool requests, messages, and deal confirmations
            will appear here.
          </p>
        </div>
      ) : (
        <div className="agri-card divide-y divide-[#E4E8E2] overflow-hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center",
                !item.is_read ? "bg-[#173D32]/5" : "bg-white",
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!item.is_read && (
                    <span className="h-2 w-2 rounded-full bg-[#D5A45B]" />
                  )}
                  <h3 className="text-xs font-bold text-[#242B31]">
                    {item.title}
                  </h3>
                  <span className="text-[11px] text-[#718078]">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
                <p className="text-xs text-[#718078]">{item.body}</p>
              </div>

              <div className="flex items-center gap-2">
                {!item.is_read && (
                  <button
                    type="button"
                    onClick={() => markOneRead(item.id)}
                    className="rounded-lg border border-[#E4E8E2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#718078] hover:text-[#173D32]"
                  >
                    Mark read
                  </button>
                )}
                {item.link && (
                  <Link
                    href={item.link}
                    onClick={() => !item.is_read && markOneRead(item.id)}
                    className="rounded-lg bg-[#173D32] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#244638]"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

