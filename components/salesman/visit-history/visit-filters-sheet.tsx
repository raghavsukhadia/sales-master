"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VisitFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function VisitFiltersSheet({ open, onClose, children }: VisitFiltersSheetProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 md:bg-transparent",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Visit filters"
        aria-hidden={!open}
        className={cn(
          "fixed z-50 bg-white shadow-lg transition-transform duration-200 ease-out",
          "inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]",
          "md:inset-auto md:right-4 md:top-20 md:w-80 md:rounded-xl md:border md:border-border",
          open ? "translate-y-0 md:translate-y-0 md:opacity-100" : "pointer-events-none translate-y-full md:translate-y-2 md:opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
