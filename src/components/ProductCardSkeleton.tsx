export default function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex justify-between pt-1">
          <div className="h-4 bg-slate-200 rounded w-16" />
          <div className="h-7 w-16 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
