import { Skeleton } from '@/components/ui/Skeleton'

export default function TeamLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header with back arrow and tabs */}
      <div className="flex items-center gap-6 px-6 py-4">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-6 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-6 rounded" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Members Card */}
          <div className="rounded-lg border border-border bg-card">
            {/* Card Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-20 rounded" />
            </div>

            {/* Member Rows */}
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-14 rounded" />
                      </div>
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
