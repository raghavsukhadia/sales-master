"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface VisitActivityPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  buildHref: (page: number) => string;
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function VisitActivityPagination({
  page,
  totalPages,
  totalCount,
  buildHref,
}: VisitActivityPaginationProps) {
  if (totalCount === 0) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} visit{totalCount === 1 ? "" : "s"}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "rounded-lg border border-border px-3 py-1.5 text-sm",
            page <= 1
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Previous
        </Link>
        {pages.map((p, index) => {
          const prev = pages[index - 1];
          const showEllipsis = prev != null && p - prev > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {showEllipsis ? (
                <span className="px-1 text-xs text-muted-foreground" aria-hidden>
                  …
                </span>
              ) : null}
              <Link
                href={buildHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "min-w-8 rounded-lg border px-2.5 py-1.5 text-center text-sm tabular-nums",
                  p === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {p}
              </Link>
            </span>
          );
        })}
        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "rounded-lg border border-border px-3 py-1.5 text-sm",
            page >= totalPages
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Next
        </Link>
      </nav>
    </div>
  );
}
