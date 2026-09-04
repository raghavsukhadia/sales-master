import { Button } from "@/components/ui/button";

interface FollowupManagementEmptyProps {
  onReset?: () => void;
  message?: string;
}

export function FollowupManagementEmpty({
  onReset,
  message = "No follow-ups found for the selected filters.",
}: FollowupManagementEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-white px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a different status tab or clear filters.</p>
      {onReset ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onReset}>
          Reset filters
        </Button>
      ) : null}
    </div>
  );
}
