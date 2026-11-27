import React from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-[#1F6B48]/10 text-[#1F6B48] border-[#1F6B48]/25",
  FULL: "bg-[#D5A45B]/15 text-[#8A611E] border-[#D5A45B]/40",
  CLOSED: "bg-[#718078]/12 text-[#242B31] border-[#718078]/30",
  CANCELLED: "bg-[#B83B3B]/10 text-[#B83B3B] border-[#B83B3B]/25",
  COMPLETED: "bg-[#173D32]/10 text-[#173D32] border-[#173D32]/25",
  PENDING: "bg-[#D5A45B]/15 text-[#8A611E] border-[#D5A45B]/40",
  ACCEPTED_FOR_DISCUSSION: "bg-[#244638]/10 text-[#244638] border-[#244638]/25",
  NEGOTIATING: "bg-[#D5A45B]/20 text-[#7A5416] border-[#D5A45B]/50",
  CONFIRMED: "bg-[#1F6B48]/12 text-[#1F6B48] border-[#1F6B48]/30",
  IN_TRANSIT: "bg-[#173D32]/12 text-[#173D32] border-[#173D32]/30",
  DELIVERED: "bg-[#1F6B48]/15 text-[#173D32] border-[#1F6B48]/35",
  REJECTED: "bg-[#B83B3B]/10 text-[#B83B3B] border-[#B83B3B]/25",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style =
    STATUS_STYLES[status] || "bg-[#F4F5F1] text-[#242B31] border-[#E4E8E2]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        style,
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

