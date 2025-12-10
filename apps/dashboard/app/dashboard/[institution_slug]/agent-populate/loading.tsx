export default function AIScannnerLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse">
            <div className="h-12 w-12" />
          </div>
        </div>

        <div className="h-8 w-48 mx-auto mb-4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-64 mx-auto mb-2 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-56 mx-auto rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
      </div>
    </div>
  )
}
