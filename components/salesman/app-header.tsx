"use client";

import { Briefcase, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export function AppHeader({ menuOpen, onMenuToggle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:h-16">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <Briefcase className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-foreground">
              Sales Master
            </p>
            <p className="truncate text-xs text-muted-foreground">Field Sales</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onMenuToggle}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="salesman-nav-drawer"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
