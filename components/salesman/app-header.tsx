"use client";

import { Menu } from "lucide-react";
import { SalesMasterLogo } from "@/components/branding/sales-master-logo";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export function AppHeader({ menuOpen, onMenuToggle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 sm:h-16">
        <div className="flex min-w-0 flex-1 items-center">
          <SalesMasterLogo size="sm" priority />
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
