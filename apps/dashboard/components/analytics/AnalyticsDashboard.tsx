'use client'

import { useState, useCallback } from 'react'
import { ChartCard, ChartConfig } from './ChartRenderer'
import { cn } from '@/lib/utils'
import { StatusBadge, TrafficLightsHeader } from '@/components/ui/TrafficLights'

/**
 * Saved chart from the database
 */
interface SavedChart {
  id: string
  institution_id: string
  chart_config: ChartConfig
  title: string
  description?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

/**
 * Analytics query response
 */
interface AnalyticsResponse {
  success: boolean
  chart_config?: ChartConfig
  chart_type?: string
  title?: string
  saved?: boolean
  chart_id?: string
  error?: string
  query?: string
  data?: Array<Record<string, unknown>>
}

/**
 * Quick stats structure
 */
interface QuickStats {
  total_applications: number
  status_distribution: Array<{ name: string; value: number }>
  applications_by_faculty: Array<{ name: string; value: number }>
  applications_by_month: Array<{ name: string; value: number }>
  top_courses: Array<{ name: string; value: number }>
}

interface AnalyticsDashboardProps {
  institutionId: string
  className?: string
}

/**
 * Example analytics queries for suggestions
 */
const EXAMPLE_QUERIES = [
  'Show acceptance rate by faculty',
  'Applications trend over the last 6 months',
  'Status distribution for all applications',
  'Compare applications by campus',
  'Top 10 most applied courses',
  'Average APS score by course',
]

/**
 * Loading skeleton for charts
 */
function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="mb-4 h-5 w-1/3 rounded bg-muted" />
      <div className="flex h-[250px] items-center justify-center">
        <div className="h-32 w-32 rounded-full bg-muted" />
      </div>
    </div>
  )
}

/**
 * Query input component
 */
function QueryInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  onSuggestionClick,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  onSuggestionClick: (query: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              onSubmit()
            }
          }}
          placeholder="Ask a question about your applications..."
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isLoading}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing...
            </span>
          ) : (
            'Generate Chart'
          )}
        </button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {EXAMPLE_QUERIES.slice(0, 4).map((query) => (
          <button
            key={query}
            onClick={() => onSuggestionClick(query)}
            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            disabled={isLoading}
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Stats card component
 */
function StatsCard({
  title,
  value,
  description,
  status,
}: {
  title: string
  value: string | number
  description?: string
  status?: 'active' | 'pending' | 'error'
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

/**
 * AnalyticsDashboard - Main analytics interface
 *
 * Features:
 * - Natural language query input
 * - Generated chart display
 * - Pinned charts grid
 * - Quick statistics
 */
export function AnalyticsDashboard({
  institutionId,
  className,
}: AnalyticsDashboardProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedChart, setGeneratedChart] = useState<ChartConfig | null>(null)
  const [pinnedCharts, setPinnedCharts] = useState<SavedChart[]>([])
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPinnedLoading, setIsPinnedLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  /**
   * Fetch pinned charts from API
   */
  const fetchPinnedCharts = useCallback(async () => {
    setIsPinnedLoading(true)
    try {
      const response = await fetch(
        `/api/agents/analytics?institutionId=${institutionId}&pinnedOnly=true`
      )
      if (!response.ok) throw new Error('Failed to fetch pinned charts')

      const data = await response.json()
      setPinnedCharts(data.charts || [])
    } catch (err) {
      console.error('Error fetching pinned charts:', err)
    } finally {
      setIsPinnedLoading(false)
    }
  }, [institutionId])

  /**
   * Fetch quick stats from API
   */
  const fetchQuickStats = useCallback(async () => {
    setIsStatsLoading(true)
    try {
      const response = await fetch(
        `/api/agents/analytics/stats?institutionId=${institutionId}`
      )
      if (!response.ok) throw new Error('Failed to fetch stats')

      const data = await response.json()
      setQuickStats(data.stats)
    } catch (err) {
      console.error('Error fetching quick stats:', err)
    } finally {
      setIsStatsLoading(false)
    }
  }, [institutionId])

  /**
   * Run analytics query
   */
  const runQuery = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setGeneratedChart(null)

    try {
      const response = await fetch('/api/agents/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          institutionId,
          saveResult: false,
          pinChart: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate chart')
      }

      const data: AnalyticsResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Analytics query failed')
      }

      if (data.chart_config) {
        setGeneratedChart(data.chart_config)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [query, institutionId])

  /**
   * Save and pin the generated chart
   */
  const saveAndPinChart = useCallback(async () => {
    if (!generatedChart) return

    try {
      const response = await fetch('/api/agents/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          institutionId,
          saveResult: true,
          pinChart: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to save chart')

      const data: AnalyticsResponse = await response.json()

      if (data.success && data.saved) {
        // Refresh pinned charts
        fetchPinnedCharts()
      }
    } catch (err) {
      console.error('Error saving chart:', err)
    }
  }, [generatedChart, query, institutionId, fetchPinnedCharts])

  /**
   * Toggle chart pin status
   */
  const toggleChartPin = useCallback(
    async (chartId: string, currentPinStatus: boolean) => {
      try {
        const response = await fetch(`/api/agents/analytics/${chartId}/pin`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPinned: !currentPinStatus }),
        })

        if (!response.ok) throw new Error('Failed to update pin status')

        // Refresh pinned charts
        fetchPinnedCharts()
      } catch (err) {
        console.error('Error toggling pin:', err)
      }
    },
    [fetchPinnedCharts]
  )

  // Load initial data
  useState(() => {
    fetchPinnedCharts()
    fetchQuickStats()
  })

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div>
        <TrafficLightsHeader status="active" title="Analytics" />
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ask questions about your application data and get instant visualizations.
        </p>
      </div>

      {/* Quick Stats */}
      {isStatsLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-muted"
            />
          ))}
        </div>
      ) : (
        quickStats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatsCard
              title="Total Applications"
              value={quickStats.total_applications}
              status="active"
            />
            <StatsCard
              title="Pending Review"
              value={
                quickStats.status_distribution.find(
                  (s) => s.name.toLowerCase() === 'pending'
                )?.value || 0
              }
              status="pending"
            />
            <StatsCard
              title="Accepted"
              value={
                quickStats.status_distribution.find(
                  (s) => s.name.toLowerCase() === 'accepted'
                )?.value || 0
              }
              status="active"
            />
            <StatsCard
              title="Rejected"
              value={
                quickStats.status_distribution.find(
                  (s) => s.name.toLowerCase() === 'rejected'
                )?.value || 0
              }
              status="error"
            />
          </div>
        )
      )}

      {/* Query Input */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 font-semibold text-foreground">
          Ask a Question
        </h2>
        <QueryInput
          value={query}
          onChange={setQuery}
          onSubmit={runQuery}
          isLoading={isLoading}
          onSuggestionClick={(suggestion) => {
            setQuery(suggestion)
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-traffic-red bg-traffic-red/10 p-4">
          <p className="text-sm text-traffic-red">{error}</p>
        </div>
      )}

      {/* Generated Chart */}
      {generatedChart && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Generated Chart</h2>
            <button
              onClick={saveAndPinChart}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              Save & Pin
            </button>
          </div>
          <ChartCard
            config={generatedChart}
            showLegend={true}
            showGrid={true}
            height={350}
          />
        </div>
      )}

      {/* Pinned Charts */}
      <div>
        <h2 className="mb-4 font-semibold text-foreground">Pinned Charts</h2>
        {isPinnedLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : pinnedCharts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              No pinned charts yet. Generate a chart and pin it to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pinnedCharts.map((chart) => (
              <ChartCard
                key={chart.id}
                config={chart.chart_config}
                title={chart.title}
                description={chart.description}
                isPinned={chart.is_pinned}
                onPinToggle={() => toggleChartPin(chart.id, chart.is_pinned)}
                showLegend={true}
                showGrid={true}
                height={300}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Charts */}
      {quickStats && (
        <div>
          <h2 className="mb-4 font-semibold text-foreground">
            Quick Insights
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution Pie Chart */}
            <ChartCard
              config={{
                type: 'pie',
                title: 'Application Status',
                data: quickStats.status_distribution,
                colors: ['#22c55e', '#facc15', '#ef4444', '#6b7280'],
              }}
              height={250}
            />

            {/* Monthly Trend Line Chart */}
            <ChartCard
              config={{
                type: 'line',
                title: 'Monthly Applications',
                data: quickStats.applications_by_month,
                xKey: 'name',
                yKey: 'value',
                colors: ['#3b82f6'],
              }}
              height={250}
            />

            {/* Faculty Distribution Bar Chart */}
            <ChartCard
              config={{
                type: 'bar',
                title: 'Applications by Faculty',
                data: quickStats.applications_by_faculty.slice(0, 6),
                xKey: 'name',
                yKey: 'value',
              }}
              height={250}
            />

            {/* Top Courses Bar Chart */}
            <ChartCard
              config={{
                type: 'bar',
                title: 'Top Courses',
                data: quickStats.top_courses.slice(0, 6),
                xKey: 'name',
                yKey: 'value',
              }}
              height={250}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard
