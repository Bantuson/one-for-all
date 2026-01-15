import { Skeleton } from '@/components/ui/Skeleton'

export default function ApplicationsLoading() {
  return (
    <div className="relative">
      {/* Back arrow placeholder */}
      <div className="absolute left-5 top-[8px]">
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Header */}
      <div className="max-w-[85%] mx-auto mt-[20px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Table Card */}
      <div className="max-w-[85%] mx-auto mt-[34px]">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>

          {/* Table header */}
          <div className="border-b border-border bg-muted/10 px-4 py-2">
            <div className="grid grid-cols-[1fr_1.5fr_100px_120px_100px_120px_60px] gap-4 text-xs font-mono text-muted-foreground">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>

          {/* Table rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border-b border-border last:border-b-0 px-4 py-3">
              <div className="grid grid-cols-[1fr_1.5fr_100px_120px_100px_120px_60px] gap-4 items-center">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
