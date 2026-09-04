import { Button } from "@/components/ui/button";

type EmptyVariant = "empty" | "error";

interface FollowupsEmptyProps {
  variant: EmptyVariant;
  onRetry?: () => void;
}

export function FollowupsEmpty({ variant, onRetry }: FollowupsEmptyProps) {
  if (variant === "error") {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center">
        <p className="font-medium">Couldn&apos;t load follow-ups.</p>
        <p className="mt-1 text-sm text-muted-foreground">Please check your connection and try again.</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="lg" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-white px-4 py-8 text-center">
      <p className="font-medium">No pending follow-ups.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        When you have dealer calls or actions due, they will appear here.
      </p>
    </div>
  );
}
