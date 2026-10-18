/**
 * Reusable skeleton placeholder with shimmer animation.
 *
 * <Skeleton className="h-4 w-24" />
 * <Skeleton.Text lines={3} />
 * <Skeleton.ProductCard />
 */
export default function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%] animate-shimmer ${rounded} ${className}`}
    />
  );
}

/* ─── Text lines ─── */
Skeleton.Text = function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

/* ─── Product card placeholder ─── */
Skeleton.ProductCard = function SkeletonProductCard() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-square w-full" rounded="rounded-none" />
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-end pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-9" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
};

/* ─── Generic list card (orders, feedback, inventory) ─── */
Skeleton.ListCard = function SkeletonListCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
      <Skeleton className="w-11 h-11 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-12" rounded="rounded-full" />
        </div>
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  );
};

/* ─── KPI card placeholder ─── */
Skeleton.KpiCard = function SkeletonKpiCard() {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="w-8 h-8 shrink-0" />
      </div>
    </div>
  );
};

/* ─── List of list cards ─── */
Skeleton.List = function SkeletonList({ count = 6 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.ListCard key={i} />
      ))}
    </div>
  );
};

/* ─── Grid of product cards ─── */
Skeleton.ProductGrid = function SkeletonProductGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.ProductCard key={i} />
      ))}
    </div>
  );
};

/* ─── KPI grid ─── */
Skeleton.KpiGrid = function SkeletonKpiGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.KpiCard key={i} />
      ))}
    </div>
  );
};