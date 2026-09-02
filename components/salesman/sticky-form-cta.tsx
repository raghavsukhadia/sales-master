"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyFormCtaProps {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
}

export function StickyFormCta({
  label,
  disabled,
  loading,
  onClick,
  secondaryLabel,
  onSecondaryClick,
}: StickyFormCtaProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md gap-2 md:max-w-5xl">
        {secondaryLabel && onSecondaryClick ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onSecondaryClick}
            className="flex-1"
          >
            {secondaryLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          size="lg"
          disabled={disabled || loading}
          onClick={onClick}
          className={cn(
            "flex-1",
            disabled && "opacity-40",
          )}
        >
          {loading ? "Saving…" : label}
        </Button>
      </div>
    </div>
  );
}
