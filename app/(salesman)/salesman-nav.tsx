"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  History,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesMasterLogo } from "@/components/branding/sales-master-logo";
import { AppHeader } from "@/components/salesman/app-header";
import { NavItem } from "@/components/salesman/nav-item";
import { NavigationDrawer } from "@/components/salesman/navigation-drawer";

interface NavConfigItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  matchPaths?: string[];
}

const NAV_ITEMS: NavConfigItem[] = [
  {
    href: "/record-visit",
    label: "Record Visit",
    icon: ClipboardList,
    enabled: true,
    matchPaths: ["/record-visit"],
  },
  { href: "/visit-history", label: "Visit History", icon: History, enabled: true, matchPaths: ["/visit-history"] },
  { href: "/reports", label: "Reports", icon: BarChart3, enabled: false },
  { href: "/our-details", label: "Our Details", icon: Building2, enabled: false },
];

interface SalesmanNavProps {
  salesmanName: string;
  roleLabel: string;
  signOutAction: () => void;
}

export function SalesmanNav({ salesmanName, roleLabel, signOutAction }: SalesmanNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = salesmanName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function isActive(item: NavConfigItem): boolean {
    const paths = item.matchPaths ?? [item.href];
    return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }

  return (
    <>
      <AppHeader menuOpen={drawerOpen} onMenuToggle={() => setDrawerOpen((open) => !open)} />

      <NavigationDrawer open={drawerOpen} onClose={closeDrawer}>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4">
          <SalesMasterLogo size="md" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{salesmanName}</p>
              <p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              label={item.label}
              icon={item.icon}
              href={item.enabled ? item.href : undefined}
              active={item.enabled && isActive(item)}
              disabled={!item.enabled}
              comingSoon={!item.enabled}
              onNavigate={closeDrawer}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-border px-3 py-3">
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="lg"
              className="h-11 w-full justify-start gap-3 px-3 text-foreground"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      </NavigationDrawer>
    </>
  );
}
