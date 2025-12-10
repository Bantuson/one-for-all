export default function CampusWizardLoading() {
  return (
    <div className="flex flex-col flex-1">
      {/* Header skeleton */}
      <div className="p-4 border-b bg-white dark:bg-black sticky top-16 z-10">
        <div className="container mx-auto max-w-4xl flex items-center gap-4">
          <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>

      <div className="container mx-auto pb-8 px-4 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Description skeleton */}
          <div className="mb-8">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>

          {/* Stepper skeleton */}
          <div className="mb-8 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>

          {/* Form skeleton */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
