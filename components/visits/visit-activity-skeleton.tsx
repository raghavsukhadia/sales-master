export function VisitActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[72px] animate-pulse rounded-xl bg-muted" />
      <div className="h-11 animate-pulse rounded-lg bg-muted" />
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
