import { Phone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowupCallButtonProps {
  telLink: string | null;
  dealerPhone: string | null;
}

export function FollowupCallButton({ telLink, dealerPhone }: FollowupCallButtonProps) {
  if (!telLink) {
    return (
      <p className="text-sm text-muted-foreground">No phone number on file for this dealer.</p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {dealerPhone ? (
        <p className="text-sm text-muted-foreground">{dealerPhone}</p>
      ) : null}
      <a
        href={telLink}
        className={cn(buttonVariants({ size: "lg" }), "inline-flex w-full items-center justify-center gap-2")}
      >
        <Phone className="h-5 w-5 shrink-0" aria-hidden />
        Call Dealer
      </a>
    </div>
  );
}

interface FollowupRecordOutcomeButtonProps {
  onClick: () => void;
}

export function FollowupRecordOutcomeButton({ onClick }: FollowupRecordOutcomeButtonProps) {
  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClick}>
      Record Outcome
    </Button>
  );
}
