import { Skeleton } from '@/components/ui/Skeleton'

export default function RegisterLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Header comment */}
      <Skeleton className="h-4 w-96 mb-8" />

      {/* Registration Card */}
      <div className="w-full max-w-md rounded-lg border border-border bg-card">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="flex gap-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Status badge */}
          <div className="flex justify-center">
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          {/* Google button */}
          <Skeleton className="h-12 w-full rounded-lg" />

          {/* Divider */}
          <Skeleton className="h-4 w-32 mx-auto" />

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
