"use client";

import { Camera, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealerEntryMode } from "@/lib/types/salesman-visit";

const MODES: { id: DealerEntryMode; label: string; icon: typeof Camera }[] = [
  { id: "scan", label: "Scan card", icon: Camera },
  { id: "manual", label: "Enter manually", icon: Pencil },
  { id: "search", label: "Existing dealer", icon: Search },
];

interface DealerModeSegmentProps {
  value: DealerEntryMode;
  onChange: (mode: DealerEntryMode) => void;
}

export function DealerModeSegment({ value, onChange }: DealerModeSegmentProps) {
  return (
    <div className="flex rounded-xl border bg-muted/40 p-1">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const selected = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:justify-center sm:gap-1.5 sm:text-sm",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-center leading-tight">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
