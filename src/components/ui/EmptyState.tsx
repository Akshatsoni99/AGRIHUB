import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="agri-card flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4F5F1] text-[#173D32] border border-[#E4E8E2]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-[#242B31]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#718078]">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center rounded-lg bg-[#173D32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#244638]"
            >
              {actionLabel}
            </button>
          ) : (
            actionLabel &&
            actionHref && (
              <Link
                href={actionHref}
                className="inline-flex items-center rounded-lg bg-[#173D32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#244638]"
              >
                {actionLabel}
              </Link>
            )
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center rounded-lg border border-[#E4E8E2] bg-white px-4 py-2 text-sm font-semibold text-[#242B31] transition hover:bg-[#F4F5F1]"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

