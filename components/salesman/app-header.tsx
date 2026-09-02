"use client";

import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SalesMasterLogo } from "@/components/branding/sales-master-logo";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/salesman/nav-item";
import { cn } from "@/lib/utils";

export interface SalesmanNavConfigItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  matchPaths?: string[];
}

interface AppHeaderProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
  navItems: SalesmanNavConfigItem[];
  isActive: (item: SalesmanNavConfigItem) => boolean;
  salesmanName: string;
  roleLabel: string;
  signOutAction: () => void;
}

export function AppHeader({
  menuOpen,
  onMenuToggle,
  navItems,
  isActive,
  salesmanName,
  roleLabel,
  signOutAction,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4 md:h-16 md:max-w-5xl md:px-6">
        <div className="flex min-w-0 items-center md:hidden">
          <SalesMasterLogo size="sm" priority />
        </div>

        <div className="hidden shrink-0 items-center md:flex">
          <SalesMasterLogo size="md" priority className="h-12 max-w-[200px]" />
        </div>

        <nav
          className="hidden md:flex md:flex-1 md:items-center md:gap-1 md:px-4"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              variant="bar"
              label={item.label}
              icon={item.icon}
              href={item.enabled ? item.href : undefined}
              active={item.enabled && isActive(item)}
              disabled={!item.enabled}
              comingSoon={!item.enabled}
            />
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-foreground">{salesmanName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={onMenuToggle}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors md:hidden",
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
