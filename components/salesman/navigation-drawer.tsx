"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function NavigationDrawer({ open, onClose, children }: NavigationDrawerProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        id="salesman-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(85vw,320px)] max-w-full flex-col bg-white shadow-lg transition-transform duration-200 ease-out md:hidden",
          "pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </aside>
    </>
  );
}
