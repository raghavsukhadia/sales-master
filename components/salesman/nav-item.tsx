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
}

export function NavItem({
  label,
  icon: Icon,
  href,
  active,
  disabled,
  comingSoon,
  onNavigate,
}: NavItemProps) {
  const className = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active && "bg-primary/10 text-primary",
    !active && !disabled && "text-foreground hover:bg-muted",
    disabled && "cursor-not-allowed text-muted-foreground opacity-60",
  );

  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{label}</span>
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
