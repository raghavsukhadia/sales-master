"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SalesmanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this page. Please try again.
      </p>
      {process.env.NODE_ENV === "development" && error.message ? (
        <p className="max-w-sm break-words text-xs text-muted-foreground">{error.message}</p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/record-visit" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
          Back to Record Visit
        </Link>
      </div>
    </div>
  );
}
