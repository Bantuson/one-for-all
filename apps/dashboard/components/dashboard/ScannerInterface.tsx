'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CommandButton } from '@/components/ui/CommandButton'
import { CodeCard, CodeCardHeader, CodeCardContent } from '@/components/ui/CodeCard'
import { Sparkles, Globe, AlertCircle, Terminal, FlaskConical } from 'lucide-react'
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
  const searchParams = useSearchParams()
  const isTestMode = searchParams.get('test') === 'true'

  const [websiteUrl, setWebsiteUrl] = useState(defaultWebsiteUrl || '')
  const [urlError, setUrlError] = useState<string | null>(null)

  const {
    status,
    progress,
    error,
    editedResults,
    startScan,
    startTestScan,
    cancelScan,
    reset,
    acceptResults,
  } = useScanStore()

  const isScanning = selectIsScanning(useScanStore.getState())

  const validateUrl = (url: string): boolean => {
    // In test mode, URL is optional
    if (isTestMode && !url) {
      setUrlError(null)
      return true
    }

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

    if (isTestMode && !websiteUrl) {
      // Use test endpoint with fixtures
      startTestScan(institutionId)
    } else {
      startScan(institutionId, websiteUrl)
    }
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-lg">
          {/* Test Mode Banner */}
          {isTestMode && (
            <div className="mb-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center gap-2 font-mono text-xs">
                <FlaskConical className="h-4 w-4 text-purple-500" />
                <span className="text-purple-500">TEST MODE</span>
                <span className="text-muted-foreground">
                  <span className="text-traffic-green">//</span> Using fixture data - no real URL required
                </span>
              </div>
            </div>
          )}

          {/* Header - Terminal Style */}
          <div className="text-center mb-8">
            <h1 className="font-mono text-2xl mb-2">
              <span className="text-syntax-export">export</span>
              <span className="text-syntax-key ml-2">AI Website Scanner</span>
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-traffic-green">//</span> Auto-detect campuses, faculties, and courses from your website
            </p>
          </div>

          {/* URL Input - CodeCard Style */}
          <CodeCard>
            <CodeCardHeader filename="scanner.config" status="active" />
            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="website-url"
                  className="block font-mono text-sm mb-2"
                >
                  <span className="text-syntax-key">"website_url"</span>
                  <span className="text-foreground"> :</span>
                  <span className="text-destructive ml-1">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-syntax-key" />
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
                    placeholder={
                      isTestMode
                        ? '(optional) https://test-university.edu'
                        : 'https://www.university.ac.za'
                    }
                    className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {urlError && (
                  <div className="flex items-center gap-2 mt-2 font-mono text-xs text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    // Error: {urlError}
                  </div>
                )}
              </div>

              {/* Start Button - Command Style */}
              <CommandButton
                onClick={handleStartScan}
                command={isTestMode ? 'scan --test' : 'scan --website'}
                variant="purple"
                className="w-full justify-center py-4"
              />

              {/* Info Text */}
              <p className="font-mono text-xs text-muted-foreground text-center">
                <span className="text-traffic-green">//</span>
                {isTestMode
                  ? ' Uses sample university data for testing'
                  : ' Crawls your website to find academic information'}
              </p>
            </div>
          </CodeCard>

          {/* Back Link - Command Style */}
          <div className="mt-8 text-center">
            <Link href={`/dashboard/${institutionSlug}`}>
              <CommandButton command="cd .." variant="ghost" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Scanning states - show progress
  if (isScanning || status === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-syntax-key/10 border border-syntax-key/20">
              <Terminal className="h-12 w-12 text-syntax-key animate-pulse" />
            </div>
          </div>
          <h2 className="font-mono text-lg mb-2">
            <span className="text-syntax-export">populating</span>
            <span className="text-syntax-key ml-2">dashboard...</span>
          </h2>
          <p className="font-mono text-xs text-syntax-comment">
            // Creating campuses, faculties, and courses...
          </p>
        </div>
      </div>
    )
  }

  // Complete state
  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-traffic-green/10 border border-traffic-green/20">
              <Sparkles className="h-12 w-12 text-traffic-green" />
            </div>
          </div>
          <h2 className="font-mono text-xl mb-2">
            <span className="text-traffic-green">✓</span>
            <span className="text-syntax-key ml-2">Dashboard Populated</span>
          </h2>
          <p className="font-mono text-xs text-syntax-comment mb-6">
            // Institution data saved successfully
          </p>
          <Link href={`/dashboard/${institutionSlug}`}>
            <CommandButton command="cd /dashboard" variant="primary" />
          </Link>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-traffic-red/10 border border-traffic-red/20">
              <AlertCircle className="h-12 w-12 text-traffic-red" />
            </div>
          </div>
          <h2 className="font-mono text-xl mb-2">
            <span className="text-traffic-red">✗</span>
            <span className="text-syntax-key ml-2">Scan Failed</span>
          </h2>
          <p className="font-mono text-xs text-syntax-comment mb-4">
            // {error || 'An unexpected error occurred during scanning.'}
          </p>
          <div className="flex gap-4 justify-center">
            <CommandButton command="retry" variant="outline" onClick={reset} />
            <Link href={`/dashboard/${institutionSlug}`}>
              <CommandButton command="cd .." variant="ghost" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Cancelled state
  if (status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="font-mono text-lg mb-2">
            <span className="text-traffic-yellow">⚠</span>
            <span className="text-syntax-key ml-2">Scan Cancelled</span>
          </h2>
          <p className="font-mono text-xs text-syntax-comment mb-6">
            // You can start a new scan or return to dashboard
          </p>
          <div className="flex gap-4 justify-center">
            <CommandButton command="scan --new" variant="primary" onClick={reset} />
            <Link href={`/dashboard/${institutionSlug}`}>
              <CommandButton command="cd .." variant="outline" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
