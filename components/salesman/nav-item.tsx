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
  onNavigate,
  variant = "drawer",
}: NavItemProps) {
  const isBar = variant === "bar";

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
