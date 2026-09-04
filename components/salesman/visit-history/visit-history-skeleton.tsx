export function VisitHistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[88px] animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
