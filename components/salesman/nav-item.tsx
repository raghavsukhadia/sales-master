"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  /** Optional count badge (e.g. scheduled follow-ups). Hidden when 0 / undefined. */
  badgeCount?: number;
  onNavigate?: () => void;
  variant?: "drawer" | "bar";
}

export function NavItem({
  label,
  icon: Icon,
  href,
  active,
  disabled,
  comingSoon,
  badgeCount,
  onNavigate,
  variant = "drawer",
}: NavItemProps) {
  const isBar = variant === "bar";
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;
  const badgeLabel = showBadge ? (badgeCount > 99 ? "99+" : String(badgeCount)) : null;

  const className = cn(
    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isBar ? "px-3 py-2" : "min-h-11 w-full px-3 py-2.5",
    active && "bg-primary/10 text-primary",
    !active && !disabled && "text-foreground hover:bg-muted",
    disabled && "cursor-not-allowed text-muted-foreground opacity-60",
  );

  const content = (
    <>
      <Icon className={cn("shrink-0", isBar ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
      <span className={cn("truncate text-left", !isBar && "flex-1")}>{label}</span>
      {comingSoon ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Coming soon
        </span>
      ) : null}
      {badgeLabel ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground tabular-nums",
            isBar ? "min-w-5 px-1.5 py-0.5 text-[10px]" : "min-w-6 px-1.5 py-0.5 text-[11px]",
          )}
          aria-label={`${badgeCount} scheduled follow-ups`}
        >
          {badgeLabel}
        </span>
      ) : null}
    </>
  );

  if (disabled || !href) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
