'use client'

import { useMemo } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - recharts types will be available after pnpm install
import { BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'

/**
 * Chart configuration interface matching the backend chart_config.py output
 */
export interface ChartConfig {
  type: 'bar' | 'pie' | 'line' | 'area'
  title: string
  data: Array<{
    name: string
    value: number
    fill?: string
    [key: string]: string | number | undefined
  }>
  xKey?: string
  yKey?: string
  colors?: string[]
  gradient?: boolean
}

/**
 * Default colors following traffic light theme
 */
const DEFAULT_COLORS = [
  '#3b82f6', // primary blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#22c55e', // green
  '#facc15', // yellow
  '#ef4444', // red
  '#6b7280', // gray
]

interface ChartRendererProps {
  config: ChartConfig
  className?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
}

/**
 * Custom tooltip component for consistent styling
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; fill?: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
      {label && (
        <p className="mb-2 font-medium text-foreground">{label}</p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: entry.fill || DEFAULT_COLORS[index] }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Renders a Bar Chart
 */
function RenderBarChart({
  config,
  height,
  showLegend,
  showGrid,
}: {
  config: ChartConfig
  height: number
  showLegend: boolean
  showGrid: boolean
}) {
  const xKey = config.xKey || 'name'
  const yKey = config.yKey || 'value'
  const colors = config.colors || DEFAULT_COLORS

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {config.data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill || colors[index % colors.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Renders a Pie Chart
 */
function RenderPieChart({
  config,
  height,
  showLegend,
}: {
  config: ChartConfig
  height: number
  showLegend: boolean
}) {
  const colors = config.colors || DEFAULT_COLORS

  // Calculate percentage for each slice
  const total = config.data.reduce((sum, item) => sum + item.value, 0)
  const dataWithPercentage = config.data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={dataWithPercentage}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }: { name: string; percentage: string | number }) => `${name} (${percentage}%)`}
          outerRadius={height / 3}
          fill="#8884d8"
          dataKey="value"
        >
          {dataWithPercentage.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill || colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  )
}

/**
 * Renders a Line Chart
 */
function RenderLineChart({
  config,
  height,
  showLegend,
  showGrid,
}: {
  config: ChartConfig
  height: number
  showLegend: boolean
  showGrid: boolean
}) {
  const xKey = config.xKey || 'name'
  const yKey = config.yKey || 'value'
  const colors = config.colors || DEFAULT_COLORS

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={colors[0]}
          strokeWidth={2}
          dot={{ fill: colors[0], strokeWidth: 2 }}
          activeDot={{ r: 6, fill: colors[0] }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Renders an Area Chart
 */
function RenderAreaChart({
  config,
  height,
  showLegend,
  showGrid,
}: {
  config: ChartConfig
  height: number
  showLegend: boolean
  showGrid: boolean
}) {
  const xKey = config.xKey || 'name'
  const yKey = config.yKey || 'value'
  const colors = config.colors || DEFAULT_COLORS
  const hasGradient = config.gradient !== false

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={colors[0]}
          strokeWidth={2}
          fill={hasGradient ? 'url(#colorGradient)' : colors[0]}
          fillOpacity={hasGradient ? 1 : 0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * ChartRenderer - Renders Recharts visualizations from saved_charts.chart_config
 *
 * Supports: BarChart, PieChart, LineChart, AreaChart
 * Uses traffic light colors (green/yellow/red) for status-based data
 */
export function ChartRenderer({
  config,
  className,
  height = 300,
  showLegend = true,
  showGrid = true,
}: ChartRendererProps) {
  // Validate config
  const isValid = useMemo(() => {
    return (
      config &&
      config.type &&
      config.data &&
      Array.isArray(config.data) &&
      config.data.length > 0
    )
  }, [config])

  if (!isValid) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30',
          className
        )}
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          No data available for chart
        </p>
      </div>
    )
  }

  const chartProps = { config, height, showLegend, showGrid }

  return (
    <div className={cn('w-full', className)}>
      {config.type === 'bar' && <RenderBarChart {...chartProps} />}
      {config.type === 'pie' && <RenderPieChart {...chartProps} />}
      {config.type === 'line' && <RenderLineChart {...chartProps} />}
      {config.type === 'area' && <RenderAreaChart {...chartProps} />}
    </div>
  )
}

/**
 * ChartCard - Chart with title and optional actions
 */
interface ChartCardProps extends ChartRendererProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  isPinned?: boolean
  onPinToggle?: () => void
}

export function ChartCard({
  config,
  title,
  description,
  actions,
  isPinned,
  onPinToggle,
  className,
  ...props
}: ChartCardProps) {
  const displayTitle = title || config.title

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        className
      )}
    >
      {(displayTitle || actions) && (
        <div className="mb-4 flex items-start justify-between">
          <div>
            {displayTitle && (
              <h3 className="font-semibold text-foreground">{displayTitle}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onPinToggle && (
              <button
                onClick={onPinToggle}
                className={cn(
                  'rounded p-1 transition-colors hover:bg-muted',
                  isPinned && 'text-traffic-yellow'
                )}
                title={isPinned ? 'Unpin chart' : 'Pin chart'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isPinned ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                </svg>
              </button>
            )}
            {actions}
          </div>
        </div>
      )}
      <ChartRenderer config={config} {...props} />
    </div>
  )
}

export default ChartRenderer
