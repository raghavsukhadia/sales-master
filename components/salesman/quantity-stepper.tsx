"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  id?: string;
}

export function QuantityStepper({ value, onChange, min = 1, id }: QuantityStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitDraft() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < min) {
      setDraft(String(value));
      setEditing(false);
      return;
    }
    onChange(Math.floor(parsed));
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "flex h-12 items-center overflow-hidden rounded-lg border bg-white",
        editing && "ring-2 ring-ring ring-offset-2",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="h-full shrink-0 rounded-none px-4"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {editing ? (
        <Input
          ref={inputRef}
          id={id}
          type="number"
          min={min}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
            if (e.key === "Escape") {
              setDraft(String(value));
              setEditing(false);
            }
          }}
          className="h-full border-0 text-center shadow-none focus-visible:ring-0"
        />
      ) : (
        <button
          type="button"
          id={id}
          onClick={() => setEditing(true)}
          className="flex h-full flex-1 items-center justify-center text-lg font-semibold tabular-nums"
        >
          {value}
        </button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="h-full shrink-0 rounded-none px-4"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
