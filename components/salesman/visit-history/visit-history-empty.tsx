import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyVariant = "empty" | "no-results" | "error";

interface VisitHistoryEmptyProps {
  variant: EmptyVariant;
  onRetry?: () => void;
  onClearFilters?: () => void;
}

export function VisitHistoryEmpty({ variant, onRetry, onClearFilters }: VisitHistoryEmptyProps) {
  if (variant === "error") {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center">
        <p className="font-medium">Couldn&apos;t load visit history.</p>
        <p className="mt-1 text-sm text-muted-foreground">Please check your connection and try again.</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="lg" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (variant === "no-results") {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center">
        <p className="font-medium">No visits match your search.</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
        {onClearFilters ? (
          <Button type="button" variant="outline" size="lg" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center">
      <p className="font-medium">No visits recorded yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">Your completed visits will appear here.</p>
      <Link href="/record-visit" className={cn(buttonVariants({ size: "lg" }), "mt-4 inline-flex")}>
        Record your first visit
      </Link>
    </div>
  );
}
