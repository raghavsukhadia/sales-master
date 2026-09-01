"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface VisitSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function VisitSearch({ value, onChange }: VisitSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        size="lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dealer, phone, city or product"
        className="pl-9"
        aria-label="Search visit history"
      />
    </div>
  );
}
