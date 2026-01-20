import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-border p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4" style={{ width: `${Math.random() * 40 + 60}%` }} />
            </div>
          ))}
        </div>

        {/* Course Cards Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card min-h-[200px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Body */}
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-10 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  )
}
