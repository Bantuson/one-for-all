'use client'

import { cn } from '@/lib/utils'

export type TrafficLightStatus = 'active' | 'warning' | 'error' | 'neutral'

interface TrafficLightsProps {
  status?: TrafficLightStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
  interactive?: boolean
  onDotClick?: (color: 'red' | 'yellow' | 'green') => void
}

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

const gapMap = {
  sm: 'gap-1',
  md: 'gap-1.5',
  lg: 'gap-2',
}

export function TrafficLights({
  status = 'neutral',
  size = 'md',
  className,
  interactive = false,
  onDotClick,
}: TrafficLightsProps) {
  const dotSize = sizeMap[size]
  const gap = gapMap[size]

  const handleDotClick = (color: 'red' | 'yellow' | 'green') => {
    if (interactive && onDotClick) {
      onDotClick(color)
    }
  }

  return (
    <div className={cn('flex items-center', gap, className)}>
      {/* Red dot - ALWAYS colored */}
      <span
        className={cn(
          'rounded-full transition-all duration-200',
          dotSize,
          'bg-traffic-red',
          status === 'error' && 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
          interactive && 'cursor-pointer hover:opacity-70'
        )}
        onClick={() => handleDotClick('red')}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Close' : undefined}
      />

      {/* Yellow dot - ALWAYS colored */}
      <span
        className={cn(
          'rounded-full transition-all duration-200',
          dotSize,
          'bg-traffic-yellow',
          status === 'warning' && 'shadow-[0_0_6px_rgba(250,204,21,0.5)]',
          interactive && 'cursor-pointer hover:opacity-70'
        )}
        onClick={() => handleDotClick('yellow')}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Minimize' : undefined}
      />

      {/* Green dot - ALWAYS colored */}
      <span
        className={cn(
          'rounded-full transition-all duration-200',
          dotSize,
          'bg-traffic-green',
          status === 'active' && 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
          interactive && 'cursor-pointer hover:opacity-70'
        )}
        onClick={() => handleDotClick('green')}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? 'Maximize' : undefined}
      />
    </div>
  )
}

// Convenience component for card headers
interface TrafficLightsHeaderProps {
  status?: TrafficLightStatus
  title?: string
  className?: string
}

export function TrafficLightsHeader({
  status = 'neutral',
  title,
  className,
}: TrafficLightsHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <TrafficLights status={status} size="sm" />
      {title && (
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
      )}
    </div>
  )
}

// Card header with filename style: ● ● ● filename.ext
interface TrafficLightsFilenameProps {
  status?: TrafficLightStatus
  filename: string
  filenameSize?: 'xs' | 'sm'
  badge?: React.ReactNode
  rightContent?: React.ReactNode
  className?: string
}

export function TrafficLightsFilename({
  status = 'neutral',
  filename,
  filenameSize = 'sm',
  badge,
  rightContent,
  className,
}: TrafficLightsFilenameProps) {
  return (
    <div className={cn('flex items-center justify-between w-full', className)}>
      <div className="flex items-center gap-3">
        <TrafficLights status={status} size="sm" />
        <span className={cn(
          'font-mono text-foreground',
          filenameSize === 'xs' ? 'text-xs' : 'text-sm'
        )}>{filename}</span>
        {badge}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  )
}

// Module badge: ● module
interface ModuleBadgeProps {
  label?: string
  className?: string
}

export function ModuleBadge({ label = 'module', className }: ModuleBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-traffic-green" />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

// Readonly badge
interface ReadonlyBadgeProps {
  className?: string
}

export function ReadonlyBadge({ className }: ReadonlyBadgeProps) {
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      readonly
    </span>
  )
}

// Star count badge: ★ 95.4k
interface StarBadgeProps {
  count: number | string
  className?: string
}

export function StarBadge({ count, className }: StarBadgeProps) {
  const displayCount = typeof count === 'number'
    ? count >= 1000
      ? `${(count / 1000).toFixed(1)}k`
      : count.toString()
    : count

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-mono text-primary', className)}>
      <span className="text-traffic-yellow">★</span>
      <span>{displayCount}</span>
    </span>
  )
}

// Status badge with dot: ● active
interface StatusBadgeProps {
  status: 'active' | 'pending' | 'rejected' | 'draft' | 'error' | 'success'
  label?: string
  className?: string
}

const statusColorMap: Record<StatusBadgeProps['status'], string> = {
  active: 'bg-traffic-green',
  success: 'bg-traffic-green',
  pending: 'bg-traffic-yellow',
  rejected: 'bg-traffic-red',
  error: 'bg-traffic-red',
  draft: 'bg-gray-400 dark:bg-gray-500',
}

const statusLabelMap: Record<StatusBadgeProps['status'], string> = {
  active: 'active',
  success: 'success',
  pending: 'pending',
  rejected: 'rejected',
  error: 'error',
  draft: 'draft',
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', statusColorMap[status])} />
      <span className="text-muted-foreground">{label || statusLabelMap[status]}</span>
    </span>
  )
}
