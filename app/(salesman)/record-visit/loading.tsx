export default function RecordVisitLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-full max-w-xs animate-pulse rounded-md bg-muted" />
      <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
