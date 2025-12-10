'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Sparkles, ArrowLeft, Globe, AlertCircle } from 'lucide-react'
import { useScanStore, selectIsScanning } from '@/lib/stores/scanStore'
import { ScanProgress } from './ScanProgress'
import { ScanResults } from './ScanResults'

interface ScannerInterfaceProps {
  institutionId: string
  institutionSlug: string
  defaultWebsiteUrl?: string
}

export function ScannerInterface({
  institutionId,
  institutionSlug,
  defaultWebsiteUrl,
}: ScannerInterfaceProps) {
  const [websiteUrl, setWebsiteUrl] = useState(defaultWebsiteUrl || '')
  const [urlError, setUrlError] = useState<string | null>(null)

  const {
    status,
    progress,
    error,
    editedResults,
    startScan,
    cancelScan,
    reset,
    acceptResults,
  } = useScanStore()

  const isScanning = selectIsScanning(useScanStore.getState())

  const validateUrl = (url: string): boolean => {
    if (!url) {
      setUrlError('Please enter a website URL')
      return false
    }

    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setUrlError('URL must start with http:// or https://')
        return false
      }
      setUrlError(null)
      return true
    } catch {
      setUrlError('Please enter a valid URL')
      return false
    }
  }

  const handleStartScan = () => {
    if (!validateUrl(websiteUrl)) return
    startScan(institutionId, websiteUrl)
  }

  const handleAccept = async () => {
    const success = await acceptResults()
    if (success) {
      // Redirect to dashboard after successful save
      window.location.href = `/dashboard/${institutionSlug}`
    }
  }

  // Idle state - show URL input form
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-2">AI Website Scanner</h1>
            <p className="text-muted-foreground">
              Enter your institution's website URL to automatically detect
              campuses, faculties, and courses.
            </p>
          </div>

          {/* URL Input */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="website-url"
                className="block text-sm font-medium mb-2"
              >
                Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value)
                    setUrlError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStartScan()
                    }
                  }}
                  placeholder="https://www.university.ac.za"
                  className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {urlError && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {urlError}
                </div>
              )}
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartScan}
              className="w-full py-6 text-lg"
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Start Scanning
            </Button>

            {/* Info Text */}
            <p className="text-xs text-muted-foreground text-center">
              The scanner will crawl your website to find academic information.
              This may take a few minutes depending on the size of your website.
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <Link
              href={`/dashboard/${institutionSlug}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Scanning states - show progress
  if (isScanning || status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ScanProgress
          status={status}
          progress={progress}
          error={error}
          onCancel={cancelScan}
        />
      </div>
    )
  }

  // Preview state - show results for editing
  if (status === 'preview' && editedResults) {
    return (
      <div className="min-h-screen">
        <ScanResults
          results={editedResults}
          institutionSlug={institutionSlug}
          onAccept={handleAccept}
          onCancel={reset}
          onRescan={() => {
            reset()
            // Keep the URL
          }}
        />
      </div>
    )
  }

  // Saving state
  if (status === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Saving to Dashboard</h2>
          <p className="text-muted-foreground">
            Creating your campuses, faculties, and courses...
          </p>
        </div>
      </div>
    )
  }

  // Complete state
  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900">
              <Sparkles className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Dashboard Populated!</h2>
          <p className="text-muted-foreground mb-6">
            Your institution data has been saved successfully.
          </p>
          <Link href={`/dashboard/${institutionSlug}`}>
            <Button size="lg">
              View Your Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Scan Failed</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'An unexpected error occurred during scanning.'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={reset}>
              Try Again
            </Button>
            <Link href={`/dashboard/${institutionSlug}`}>
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Cancelled state
  if (status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Scan Cancelled</h2>
          <p className="text-muted-foreground mb-6">
            The scan was cancelled. You can start a new scan or return to your
            dashboard.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={reset}>Start New Scan</Button>
            <Link href={`/dashboard/${institutionSlug}`}>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
