import { Skeleton } from '@/components/ui/Skeleton'

export default function ApplicationsLoading() {
  return (
    <div className="relative">
      {/* Back arrow placeholder */}
      <div className="absolute left-5 top-[8px]">
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Header - count and filter dropdown on the right */}
      <div className="max-w-[85%] mx-auto mt-[20px] flex items-center justify-end gap-2 translate-y-[4px]">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-5 w-6" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Cards Grid - 4 columns */}
      <div className="max-w-[85%] mx-auto mt-[34px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ApplicationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ApplicationCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card min-h-[220px] flex flex-col">
      {/* Header: traffic lights + ref# + badge */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded" />
      </div>

      {/* Body */}
      <div className="flex-1 p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex justify-end">
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  )
}
