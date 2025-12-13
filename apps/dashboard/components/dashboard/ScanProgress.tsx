'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertCircle, Globe, FileSearch, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ScanProgress as ScanProgressType, ScanStatus } from '@/lib/scanner/types'

interface ScanProgressProps {
  status: ScanStatus
  progress: ScanProgressType
  error: string | null
  onCancel: () => void
}

const STAGE_ICONS: Record<string, typeof Loader2> = {
  Initializing: Globe,
  Scraping: FileSearch,
  Analyzing: Sparkles,
  Refining: Sparkles,
  Preview: CheckCircle2,
  Complete: CheckCircle2,
  Cancelled: XCircle,
  Error: AlertCircle,
}

const STAGE_COLORS: Record<string, string> = {
  Initializing: 'text-primary',
  Scraping: 'text-traffic-yellow',
  Analyzing: 'text-purple-500',
  Refining: 'text-blue-500',
  Preview: 'text-traffic-green',
  Complete: 'text-traffic-green',
  Cancelled: 'text-muted-foreground',
  Error: 'text-destructive',
}

export function ScanProgress({
  status,
  progress,
  error,
  onCancel,
}: ScanProgressProps) {
  const [elapsedDisplay, setElapsedDisplay] = useState('0:00')

  // Update elapsed time display
  useEffect(() => {
    if (status === 'idle' || status === 'complete' || status === 'cancelled') {
      return
    }

    const startTime = Date.now() - progress.elapsedMs

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      setElapsedDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [status, progress.elapsedMs])

  const StageIcon = STAGE_ICONS[progress.stage] || Loader2
  const stageColor = STAGE_COLORS[progress.stage] || 'text-primary'
  const isActive = status === 'connecting' || status === 'scraping' || status === 'analyzing'
  const isRefining = progress.stage === 'Refining'
  const isPreview = status === 'preview'

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Stage Icon */}
      <div className="flex justify-center mb-6">
        <div className={`p-4 rounded-full bg-muted ${stageColor}`}>
          {isActive ? (
            <Loader2 className="h-12 w-12 animate-spin" />
          ) : (
            <StageIcon className="h-12 w-12" />
          )}
        </div>
      </div>

      {/* Stage Title */}
      <h2 className="text-xl font-semibold text-center mb-2">{progress.stage}</h2>

      {/* Progress Message */}
      <p className="text-muted-foreground text-center mb-4">{progress.message}</p>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{progress.pagesDiscovered}</div>
          <div className="text-xs text-muted-foreground">Discovered</div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{progress.pagesScraped}</div>
          <div className="text-xs text-muted-foreground">Scraped</div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-2xl font-bold">{progress.itemsExtracted}</div>
          <div className="text-xs text-muted-foreground">Extracted</div>
        </div>
      </div>

      {/* Elapsed Time */}
      <div className="text-center text-sm text-muted-foreground mb-4">
        Elapsed: {elapsedDisplay}
      </div>

      {/* Current URL */}
      {progress.currentUrl && isActive && (
        <div className="text-center text-xs text-muted-foreground mb-4 truncate px-4">
          Scanning: {progress.currentUrl}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{error}</div>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {isActive && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel Scan
          </Button>
        </div>
      )}
    </div>
  )
}
